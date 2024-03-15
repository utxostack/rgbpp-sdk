import { RgbppCkbVirtualTx, BtcJumpCkbVirtualTxParams, BtcJumpCkbVirtualTxResult } from '../types/rgbpp';
import { blockchain } from '@ckb-lumos/base';
import { NoRgbppLiveCellError } from '../error';
import { append0x, calculateRgbppCellCapacity, u128ToLe } from '../utils';
import {
  buildPreLockArgs,
  calculateCommitment,
  compareInputs,
  genBtcTimeLockScript,
  genRgbppLockScript,
} from '../utils/rgbpp';
import { Hex, IndexerCell } from '../types';
import { RGBPP_WITNESS_PLACEHOLDER, getRgbppLockDep, getSecp256k1CellDep, getXudtDep } from '../constants';
import { addressToScript } from '@nervosnetwork/ckb-sdk-utils';

/**
 * Generate the virtual ckb transaction for the jumping tx from BTC to CKB
 * @param collector The collector that collects CKB live cells and transactions
 * @param xudtTypeBytes The serialized hex string of the XUDT type script
 * @param rgbppLockArgsList The rgbpp assets cell lock script args array whose data structure is: out_index | bitcoin_tx_id
 * @param transferAmount The XUDT amount to be transferred
 * @param isMainnet
 */
export const genBtcJumpCkbVirtualTx = async ({
  collector,
  xudtTypeBytes,
  rgbppLockArgsList,
  transferAmount,
  toCkbAddress,
}: BtcJumpCkbVirtualTxParams): Promise<BtcJumpCkbVirtualTxResult> => {
  const isMainnet = toCkbAddress.startsWith('ckb');
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

  const rpbppCellCapacity = calculateRgbppCellCapacity(xudtType);
  const outputsData = [append0x(u128ToLe(transferAmount))];

  const toLock = addressToScript(toCkbAddress);
  const outputs: CKBComponents.CellOutput[] = [
    {
      lock: genBtcTimeLockScript(toLock, isMainnet),
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

  const cellDeps = [getRgbppLockDep(isMainnet), getXudtDep(isMainnet)];
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

  const virtualTx: RgbppCkbVirtualTx = {
    inputs,
    outputs,
    outputsData,
  };
  const commitment = calculateCommitment(virtualTx);

  return {
    ckbRawTx,
    commitment,
    needPaymasterCell,
    sumInputsCapacity: append0x(sumInputsCapacity.toString(16)),
  };
};
