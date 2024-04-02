import {
  BtcBatchTransferVirtualTxParams,
  BtcTransferVirtualTxParams,
  BtcTransferVirtualTxResult,
  RgbppCkbVirtualTx,
} from '../types/rgbpp';
import { blockchain } from '@ckb-lumos/base';
import { NoRgbppLiveCellError, TypeAssetNotSupportedError } from '../error';
import {
  append0x,
  calculateRgbppCellCapacity,
  calculateTransactionFee,
  isTypeAssetSupported,
  u128ToLe,
} from '../utils';
import {
  buildPreLockArgs,
  calculateCommitment,
  compareInputs,
  estimateWitnessSize,
  genRgbppLockScript,
} from '../utils/rgbpp';
import { Hex, IndexerCell } from '../types';
import {
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
 * @param transferAmount The XUDT amount to be transferred, if the noMergeOutputCells is true, the transferAmount will be ignored
 * @param isMainnet
 * @param noMergeOutputCells The noMergeOutputCells indicates whether the CKB outputs need to be merged. By default, the outputs will be merged.
 * @param witnessLockPlaceholderSize The WitnessArgs.lock placeholder bytes array size and the default value is 3000(It can make most scenarios work properly)
 * @param ckbFeeRate The CKB transaction fee rate, default value is 1100
 */
export const genBtcTransferCkbVirtualTx = async ({
  collector,
  xudtTypeBytes,
  rgbppLockArgsList,
  transferAmount,
  isMainnet,
  noMergeOutputCells,
  witnessLockPlaceholderSize,
  ckbFeeRate,
}: BtcTransferVirtualTxParams): Promise<BtcTransferVirtualTxResult> => {
  const xudtType = blockchain.Script.unpack(xudtTypeBytes) as CKBComponents.Script;

  if (!isTypeAssetSupported(xudtType, isMainnet)) {
    throw new TypeAssetNotSupportedError('The type script asset is not supported now');
  }

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

  let inputs: CKBComponents.CellInput[] = [];
  let sumInputsCapacity = BigInt(0);
  let outputs: CKBComponents.CellOutput[] = [];
  let outputsData: Hex[] = [];
  let changeCapacity = BigInt(0);

  if (noMergeOutputCells) {
    for (const [index, rgbppCell] of rgbppCells.entries()) {
      inputs.push({
        previousOutput: rgbppCell.outPoint,
        since: '0x0',
      });
      sumInputsCapacity += BigInt(rgbppCell.output.capacity);
      outputs.push({
        ...rgbppCell.output,
        // The Vouts[0] for OP_RETURN and Vouts[1], Vouts[2], ... for RGBPP assets
        lock: genRgbppLockScript(buildPreLockArgs(index + 1), isMainnet),
      });
      outputsData.push(rgbppCell.outputData);
    }
    changeCapacity = BigInt(rgbppCells[rgbppCells.length - 1].output.capacity);
  } else {
    const collectResult = collector.collectUdtInputs({
      liveCells: rgbppCells,
      needAmount: transferAmount,
      isMax: true,
    });
    inputs = collectResult.inputs;
    sumInputsCapacity = collectResult.sumInputsCapacity;

    rgbppCells = rgbppCells.slice(0, inputs.length);

    const rpbppCellCapacity = calculateRgbppCellCapacity(xudtType);
    outputsData.push(append0x(u128ToLe(transferAmount)));

    changeCapacity = sumInputsCapacity;
    // The Vouts[0] for OP_RETURN and Vouts[1], Vouts[2], ... for RGBPP assets
    outputs.push({
      lock: genRgbppLockScript(buildPreLockArgs(1), isMainnet),
      type: xudtType,
      capacity: append0x(rpbppCellCapacity.toString(16)),
    });
    if (collectResult.sumAmount > transferAmount) {
      outputs.push({
        lock: genRgbppLockScript(buildPreLockArgs(2), isMainnet),
        type: xudtType,
        capacity: append0x(rpbppCellCapacity.toString(16)),
      });
      outputsData.push(append0x(u128ToLe(collectResult.sumAmount - transferAmount)));
      changeCapacity -= rpbppCellCapacity;
    }
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
    const txSize =
      getTransactionSize(ckbRawTx) + (witnessLockPlaceholderSize ?? estimateWitnessSize(rgbppLockArgsList));
    const estimatedTxFee = calculateTransactionFee(txSize, ckbFeeRate);

    changeCapacity -= estimatedTxFee;
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

/**
 * Generate the virtual ckb transaction for the btc batch transfer tx
 * @param collector The collector that collects CKB live cells and transactions
 * @param xudtTypeBytes The serialized hex string of the XUDT type script
 * @param rgbppLockArgsList The rgbpp assets cell lock script args array whose data structure is: out_index | bitcoin_tx_id
 * @param rgbppReceivers The rgbpp receiver list which include toBtcAddress and transferAmount
 * @param isMainnet
 */
export const genBtcBatchTransferCkbVirtualTx = async ({
  collector,
  xudtTypeBytes,
  rgbppLockArgsList,
  rgbppReceivers,
  isMainnet,
}: BtcBatchTransferVirtualTxParams): Promise<BtcTransferVirtualTxResult> => {
  const xudtType = blockchain.Script.unpack(xudtTypeBytes) as CKBComponents.Script;

  if (!isTypeAssetSupported(xudtType, isMainnet)) {
    throw new TypeAssetNotSupportedError('The type script asset is not supported now');
  }

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

  const sumTransferAmount = rgbppReceivers
    .map((receiver) => receiver.transferAmount)
    .reduce((prev, current) => prev + current, BigInt(0));

  const rpbppCellCapacity = calculateRgbppCellCapacity(xudtType);
  const outputs: CKBComponents.CellOutput[] = rgbppReceivers.map((_, index) => ({
    // The Vouts[0] for OP_RETURN and Vouts[1], Vouts[2], ... for RGBPP assets
    lock: genRgbppLockScript(buildPreLockArgs(index + 1), isMainnet),
    type: xudtType,
    capacity: append0x(rpbppCellCapacity.toString(16)),
  }));
  const outputsData = rgbppReceivers.map((receiver) => append0x(u128ToLe(receiver.transferAmount)));

  const { inputs, sumInputsCapacity, sumAmount } = collector.collectUdtInputs({
    liveCells: rgbppCells,
    needAmount: sumTransferAmount,
    isMax: true,
  });

  let changeCapacity = sumInputsCapacity - rpbppCellCapacity * BigInt(rgbppReceivers.length);
  const lastUtxoIndex = rgbppReceivers.length + 1;
  outputs.push({
    // The Vouts[0] for OP_RETURN and Vouts[1], Vouts[2], ... for RGBPP assets
    lock: genRgbppLockScript(buildPreLockArgs(lastUtxoIndex), isMainnet),
    type: xudtType,
    capacity: append0x(changeCapacity.toString(16)),
  });

  if (sumAmount > sumTransferAmount) {
    outputsData.push(append0x(u128ToLe(sumAmount - sumTransferAmount)));
  } else {
    outputsData.push('0x');
  }

  const cellDeps = [getRgbppLockDep(isMainnet), getXudtDep(isMainnet), getRgbppLockConfigDep(isMainnet)];
  const witnesses: Hex[] = inputs.map((_, index) => (index === 0 ? RGBPP_WITNESS_PLACEHOLDER : '0x'));

  const ckbRawTx: CKBComponents.RawTransaction = {
    version: '0x0',
    cellDeps,
    headerDeps: [],
    inputs,
    outputs,
    outputsData,
    witnesses,
  };

  const txSize = getTransactionSize(ckbRawTx) + RGBPP_TX_WITNESS_MAX_SIZE;
  const estimatedTxFee = calculateTransactionFee(txSize);
  changeCapacity -= estimatedTxFee;
  ckbRawTx.outputs[ckbRawTx.outputs.length - 1].capacity = append0x(changeCapacity.toString(16));

  const virtualTx: RgbppCkbVirtualTx = {
    ...ckbRawTx,
  };
  const commitment = calculateCommitment(virtualTx);

  return {
    ckbRawTx,
    commitment,
    needPaymasterCell: false,
    sumInputsCapacity: append0x(sumInputsCapacity.toString(16)),
  };
};
