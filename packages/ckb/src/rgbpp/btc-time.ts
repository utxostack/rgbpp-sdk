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
import { BtcTimeCellStatusParams, BtcTimeCellsParams, Hex, SignBtcTimeCellsTxParams } from '../types';
import {
  append0x,
  btcTxIdFromBtcTimeLockArgs,
  calculateTransactionFee,
  compareInputs,
  genBtcTimeLockArgs,
  lockScriptFromBtcTimeLockArgs,
  transformSpvProof,
} from '../utils';
import { buildSpvClientCellDep } from '../utils';
import { blockchain } from '@ckb-lumos/base';
import signWitnesses from '@nervosnetwork/ckb-sdk-core/lib/signWitnesses';

export const buildBtcTimeUnlockWitness = (btcTxProof: Hex): Hex => {
  const btcTimeUnlock = BTCTimeUnlock.pack({ btcTxProof: blockchain.Bytes.pack(btcTxProof) });
  return append0x(bytesToHex(btcTimeUnlock));
};

/**
 * Collect btc time cells and spend them to create xUDT cells for the specific lock scripts in the btc time lock args
 * The btc time lock args data structure is: lock_script | after | new_bitcoin_tx_id
 * @param btcTimeCells The BTC time cells of xUDT
 * @param btcAssetsApi BTC Assets Api
 * @param isMainnet
 */
export const buildBtcTimeCellsSpentTx = async ({
  btcTimeCells,
  btcAssetsApi,
  isMainnet,
}: BtcTimeCellsParams): Promise<CKBComponents.RawTransaction> => {
  const sortedBtcTimeCells = btcTimeCells.sort(compareInputs);
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
  for await (const btcTimeCell of sortedBtcTimeCells) {
    if (lockArgsSet.has(btcTimeCell.output.lock.args)) {
      witnesses.push('0x');
      continue;
    }
    lockArgsSet.add(btcTimeCell.output.lock.args);
    const result = await btcAssetsApi.getRgbppSpvProof(
      btcTxIdFromBtcTimeLockArgs(btcTimeCell.output.lock.args),
      BTC_JUMP_CONFIRMATION_BLOCKS,
    );
    const { spvClient, proof } = transformSpvProof(result);

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
 * @param outputCapacityRange [u64; 2], filter cells by output capacity range, [inclusive, exclusive]
 * @param ckbFeeRate The CKB transaction fee rate, default value is 1100
 * @param isMainnet
 */
export const signBtcTimeCellSpentTx = async ({
  secp256k1PrivateKey,
  ckbRawTx,
  collector,
  masterCkbAddress,
  isMainnet,
  outputCapacityRange,
  ckbFeeRate,
}: SignBtcTimeCellsTxParams): Promise<CKBComponents.RawTransaction> => {
  const masterLock = addressToScript(masterCkbAddress);
  let emptyCells = await collector.getCells({
    lock: masterLock,
    outputCapacityRange,
  });
  if (!emptyCells || emptyCells.length === 0) {
    throw new Error('No empty cell found');
  }
  emptyCells = emptyCells.filter((cell) => !cell.output.type);
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
  const estimatedTxFee = calculateTransactionFee(txSize, ckbFeeRate);

  const changeCapacity = BigInt(emptyCells[0].output.capacity) - estimatedTxFee;
  rawTx.outputs[0].capacity = append0x(changeCapacity.toString(16));

  const keyMap = new Map<string, string>();
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

/**
 * Check if the BTC time cells have been spent. If so, it means the RGB++ asset jumping(from BTC to CKB) has been successful.
 * @param collector The collector that collects CKB live cells and transactions
 * @param ckbAddress The CKB address
 * @param btcTxId The BTC transaction id
 */
export const isBtcTimeCellsSpent = async ({
  collector,
  ckbAddress,
  btcTxId,
}: BtcTimeCellStatusParams): Promise<boolean> => {
  const isMainnet = ckbAddress.startsWith('ckb');
  const lock = addressToScript(ckbAddress);
  const btcTimeLock: CKBComponents.Script = {
    ...getBtcTimeLockScript(isMainnet),
    args: genBtcTimeLockArgs(lock, btcTxId, BTC_JUMP_CONFIRMATION_BLOCKS),
  };
  const btcTimeCells = await collector.getCells({ lock: btcTimeLock, isDataMustBeEmpty: false });
  const isSpent = !btcTimeCells || btcTimeCells.length === 0;
  return isSpent;
};
