import { BtcTransferVirtualTxParams, BtcTransferVirtualTxResult, RgbppCkbVirtualTx } from '../types/rgbpp';
import { blockchain } from '@ckb-lumos/base';
import { NoRgbppLiveCellError } from '../error';
import { append0x, calculateRgbppCellCapacity, calculateTransactionFee, u128ToLe } from '../utils';
import { buildPreLockArgs, calculateCommitment, compareInputs, genRgbppLockScript } from '../utils/rgbpp';
import { Hex, IndexerCell } from '../types';
import {
  RGBPP_TX_WITNESS_MAX_SIZE,
  RGBPP_WITNESS_PLACEHOLDER,
  getRgbppLockConfigDep,
  getRgbppLockDep,
  getSecp256k1CellDep,
  getXudtDep,
} from '../constants';
import { getTransactionSize } from '@nervosnetwork/ckb-sdk-utils';

/**
 * Generate the virtual ckb transaction for the btc transfer tx
 * @param collector The collector that collects CKB live cells and transactions
 * @param xudtTypeBytes The serialized hex string of the XUDT type script
 * @param rgbppLockArgsList The rgbpp assets cell lock script args array whose data structure is: out_index | bitcoin_tx_id
 * @param transferAmount The XUDT amount to be transferred
 * @param isMainnet
 */
export const genBtcTransferCkbVirtualTx = async ({
  collector,
  xudtTypeBytes,
  rgbppLockArgsList,
  transferAmount,
  isMainnet,
}: BtcTransferVirtualTxParams): Promise<BtcTransferVirtualTxResult> => {
  const xudtType = blockchain.Script.unpack(xudtTypeBytes) as CKBComponents.Script;

  const rgbppLocks = rgbppLockArgsList.map((args) => genRgbppLockScript(args, isMainnet));
  let rgbppCells: IndexerCell[] = [];
  for await (const rgbppLock of rgbppLocks) {
    const cells = await collector.getCells({ lock: rgbppLock, type: xudtType });
    if (!cells || cells.length === 0) {
      throw new NoRgbppLiveCellError('No rgbpp cells found with the xudt type script and the rgbpp lock args');
    }
    rgbppCells = [...rgbppCells, ...cells];
  }
  rgbppCells = rgbppCells.sort(compareInputs);

  const { inputs, sumInputsCapacity, sumAmount } = collector.collectUdtInputs(rgbppCells, transferAmount);
  rgbppCells = rgbppCells.slice(0, inputs.length);

  const rpbppCellCapacity = calculateRgbppCellCapacity(xudtType);
  const outputsData = [append0x(u128ToLe(transferAmount))];

  // The Vouts[0] for OP_RETURN and Vouts[1], Vouts[2] for RGBPP assets
  const outputs: CKBComponents.CellOutput[] = [
    {
      lock: genRgbppLockScript(buildPreLockArgs(1), isMainnet),
      type: xudtType,
      capacity: append0x(rpbppCellCapacity.toString(16)),
    },
  ];

  if (sumAmount > transferAmount) {
    outputs.push({
      lock: genRgbppLockScript(buildPreLockArgs(2), isMainnet),
      type: xudtType,
      capacity: append0x(rpbppCellCapacity.toString(16)),
    });
    outputsData.push(append0x(u128ToLe(sumAmount - transferAmount)));
  }

  const cellDeps = [getRgbppLockDep(isMainnet), getXudtDep(isMainnet), getRgbppLockConfigDep(isMainnet)];
  const needPaymasterCell = inputs.length < outputs.length;
  if (needPaymasterCell) {
    cellDeps.push(getSecp256k1CellDep(isMainnet));
  }
  const witnesses: Hex[] = [];
  const lockArgsSet: Set<string> = new Set();
  for (const cell of rgbppCells) {
    if (lockArgsSet.has(cell.output.lock.args)) {
      witnesses.push('0x');
    } else {
      lockArgsSet.add(cell.output.lock.args);
      witnesses.push(RGBPP_WITNESS_PLACEHOLDER);
    }
  }

  const ckbRawTx: CKBComponents.RawTransaction = {
    version: '0x0',
    cellDeps,
    headerDeps: [],
    inputs,
    outputs,
    outputsData,
    witnesses,
  };

  if (!needPaymasterCell) {
    const txSize = getTransactionSize(ckbRawTx) + RGBPP_TX_WITNESS_MAX_SIZE;
    const estimatedTxFee = calculateTransactionFee(txSize);

    const changeCapacity = sumInputsCapacity - estimatedTxFee;
    ckbRawTx.outputs[ckbRawTx.outputs.length - 1].capacity = append0x(changeCapacity.toString(16));
  }

  const virtualTx: RgbppCkbVirtualTx = {
    ...ckbRawTx,
  };
  const commitment = calculateCommitment(virtualTx);

  return {
    ckbRawTx,
    commitment,
    needPaymasterCell,
    sumInputsCapacity: append0x(sumInputsCapacity.toString(16)),
  };
};
