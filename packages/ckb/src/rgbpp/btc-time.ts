import {
  addressToScript,
  bytesToHex,
  getTransactionSize,
  rawTransactionToHash,
  scriptToHash,
  serializeOutPoint,
  serializeWitnessArgs,
} from '@nervosnetwork/ckb-sdk-utils';
import {
  BTC_JUMP_CONFIRMATION_BLOCKS,
  SECP256K1_WITNESS_LOCK_SIZE,
  getBtcTimeLockConfigDep,
  getBtcTimeLockDep,
  getBtcTimeLockScript,
  getSecp256k1CellDep,
  getXudtDep,
} from '../constants';
import { BTCTimeUnlock } from '../schemas/generated/rgbpp';
import { BtcTimeCellsParams, Hex, SignBtcTimeCellsTxParams } from '../types';
import {
  append0x,
  btcTxIdFromBtcTimeLockArgs,
  calculateTransactionFee,
  compareInputs,
  lockScriptFromBtcTimeLockArgs,
} from '../utils';
import { buildSpvClientCellDep } from '../spv';
import { blockchain } from '@ckb-lumos/base';
import signWitnesses from '@nervosnetwork/ckb-sdk-core/lib/signWitnesses';

export const buildBtcTimeUnlockWitness = (btcTxProof: Hex): Hex => {
  const btcTimeUnlock = BTCTimeUnlock.pack({ btcTxProof: blockchain.Bytes.pack(btcTxProof) });
  return append0x(bytesToHex(btcTimeUnlock));
};

/**
 * Collect btc time cells and spend them to create xudt cells for the specific lock scripts in the btc time lock args
 * The btc time lock args data structure is: lock_script | after | new_bitcoin_tx_id
 * @param btcTimeCellPairs The pairs of the BTC time cell and the related btc tx(which is in the BTC time cell lock args) index in the block
 * @param spvService SPV RPC service
 * @param isMainnet
 */
export const buildBtcTimeCellsSpentTx = async ({
  btcTimeCellPairs,
  spvService,
  isMainnet,
}: BtcTimeCellsParams): Promise<CKBComponents.RawTransaction> => {
  const sortedBtcTimeCellPairs = btcTimeCellPairs.sort((pair1, pair2) =>
    compareInputs(pair1.btcTimeCell, pair2.btcTimeCell),
  );
  const sortedBtcTimeCells = sortedBtcTimeCellPairs.map((pair) => pair.btcTimeCell);
  const inputs: CKBComponents.CellInput[] = sortedBtcTimeCells.map((cell) => ({
    previousOutput: cell.outPoint,
    since: '0x0',
  }));

  const outputs: CKBComponents.CellOutput[] = sortedBtcTimeCells.map((cell) => ({
    lock: lockScriptFromBtcTimeLockArgs(cell.output.lock.args),
    type: cell.output.type,
    capacity: cell.output.capacity,
  }));

  const outputsData = sortedBtcTimeCells.map((cell) => cell.outputData);

  const cellDeps: CKBComponents.CellDep[] = [
    getBtcTimeLockDep(isMainnet),
    getXudtDep(isMainnet),
    getBtcTimeLockConfigDep(isMainnet),
  ];

  const witnesses: Hex[] = [];

  const lockArgsSet: Set<string> = new Set();
  const cellDepsSet: Set<string> = new Set();
  for await (const { btcTimeCell, btcTxIndexInBlock } of sortedBtcTimeCellPairs) {
    if (lockArgsSet.has(btcTimeCell.output.lock.args)) {
      witnesses.push('0x');
      continue;
    }
    lockArgsSet.add(btcTimeCell.output.lock.args);
    const { spvClient, proof } = await spvService.fetchSpvClientCellAndTxProof({
      btcTxId: btcTxIdFromBtcTimeLockArgs(btcTimeCell.output.lock.args),
      btcTxIndexInBlock,
      confirmBlocks: BTC_JUMP_CONFIRMATION_BLOCKS,
    });

    if (!cellDepsSet.has(serializeOutPoint(spvClient))) {
      cellDeps.push(buildSpvClientCellDep(spvClient));
      cellDepsSet.add(serializeOutPoint(spvClient));
    }

    const btcTimeWitness = append0x(
      serializeWitnessArgs({ lock: buildBtcTimeUnlockWitness(proof), inputType: '', outputType: '' }),
    );
    witnesses.push(btcTimeWitness);
  }

  const ckbTx: CKBComponents.RawTransaction = {
    version: '0x0',
    cellDeps,
    headerDeps: [],
    inputs,
    outputs,
    outputsData,
    witnesses,
  };

  return ckbTx;
};

/**
 * Sign the BTC time cells spent transaction with Secp256k1 private key
 * @param secp256k1PrivateKey The Secp256k1 private key of the master address
 * @param ckbRawTx The CKB raw transaction to be signed
 * @param collector The collector that collects CKB live cells and transactions
 * @param masterCkbAddress The master CKB address
 * @param isMainnet
 */
export const signBtcTimeCellSpentTx = async ({
  secp256k1PrivateKey,
  ckbRawTx,
  collector,
  masterCkbAddress,
  isMainnet,
}: SignBtcTimeCellsTxParams): Promise<CKBComponents.RawTransaction> => {
  const masterLock = addressToScript(masterCkbAddress);
  const emptyCells = await collector.getCells({
    lock: masterLock,
  });
  if (!emptyCells || emptyCells.length === 0) {
    throw new Error('No empty cell found');
  }
  const emptyInput: CKBComponents.CellInput = {
    previousOutput: emptyCells[0].outPoint,
    since: '0x0',
  };

  const changeOutput = emptyCells[0].output;
  const rawTx = {
    ...ckbRawTx,
    cellDeps: [...ckbRawTx.cellDeps, getSecp256k1CellDep(isMainnet)],
    inputs: [emptyInput, ...ckbRawTx.inputs],
    outputs: [changeOutput, ...ckbRawTx.outputs],
    outputsData: ['0x', ...ckbRawTx.outputsData],
    witnesses: [{ lock: '', inputType: '', outputType: '' }, ...ckbRawTx.witnesses],
  };

  const txSize = getTransactionSize(rawTx) + SECP256K1_WITNESS_LOCK_SIZE;
  const estimatedTxFee = calculateTransactionFee(txSize);

  const changeCapacity = BigInt(emptyCells[0].output.capacity) - estimatedTxFee;
  rawTx.outputs[0].capacity = append0x(changeCapacity.toString(16));

  let keyMap = new Map<string, string>();
  keyMap.set(scriptToHash(masterLock), secp256k1PrivateKey);
  keyMap.set(scriptToHash(getBtcTimeLockScript(isMainnet)), '');

  const cells = rawTx.inputs.map((input, index) => ({
    outPoint: input.previousOutput,
    lock: index === 0 ? masterLock : getBtcTimeLockScript(isMainnet),
  }));

  const transactionHash = rawTransactionToHash(rawTx);
  const signedWitnesses = signWitnesses(keyMap)({
    transactionHash,
    witnesses: rawTx.witnesses,
    inputCells: cells,
    skipMissingKeys: true,
  });

  const signedTx = {
    ...rawTx,
    witnesses: signedWitnesses.map((witness) =>
      typeof witness !== 'string' ? serializeWitnessArgs(witness) : witness,
    ),
  } as CKBComponents.RawTransaction;

  return signedTx;
};
