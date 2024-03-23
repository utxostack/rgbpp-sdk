import { bytesToHex, getTransactionSize, serializeWitnessArgs } from '@nervosnetwork/ckb-sdk-utils';
import { BTC_JUMP_CONFIRMATION_BLOCKS, getBtcTimeLockConfigDep, getBtcTimeLockDep, getXudtDep } from '../constants';
import { BTCTimeUnlock } from '../schemas/generated/rgbpp';
import { BtcTimeCellsParams, Hex } from '../types';
import {
  append0x,
  btcTxIdFromBtcTimeLockArgs,
  calculateTransactionFee,
  compareInputs,
  lockScriptFromBtcTimeLockArgs,
} from '../utils';
import { buildSpvClientCellDep } from '../spv';
import { blockchain } from '@ckb-lumos/base';

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
    cellDeps.push(buildSpvClientCellDep(spvClient));
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

  const txSize = getTransactionSize(ckbTx);
  const estimatedTxFee = calculateTransactionFee(txSize);
  const lastOutputCapacity = BigInt(outputs[outputs.length - 1].capacity) - estimatedTxFee;
  ckbTx.outputs[outputs.length - 1].capacity = append0x(lastOutputCapacity.toString(16));

  return ckbTx;
};
