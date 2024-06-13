import { CkbBatchJumpBtcVirtualTxParams, CkbJumpBtcVirtualTxParams } from '../types/rgbpp';
import { blockchain } from '@ckb-lumos/base';
import { NoLiveCellError, NoXudtLiveCellError, TypeAssetNotSupportedError } from '../error';
import {
  append0x,
  calculateRgbppCellCapacity,
  calculateTransactionFee,
  calculateUdtCellCapacity,
  fetchTypeIdCellDeps,
  isTypeAssetSupported,
  u128ToLe,
} from '../utils';
import { genRgbppLockScript } from '../utils/rgbpp';
import { MAX_FEE, MIN_CAPACITY, RGBPP_TX_WITNESS_MAX_SIZE } from '../constants';
import { addressToScript, getTransactionSize } from '@nervosnetwork/ckb-sdk-utils';

/**
 * Generate the virtual ckb transaction for the jumping tx from CKB to BTC
 * @param collector The collector that collects CKB live cells and transactions
 * @param xudtTypeBytes The serialized hex string of the XUDT type script
 * @param fromCkbAddress The from ckb address who will use his private key to sign the ckb tx
 * @param toRgbppLockArgs The receiver rgbpp lock script args whose data structure is: out_index | bitcoin_tx_id
 * @param transferAmount The XUDT amount to be transferred
 * @param witnessLockPlaceholderSize(Optional)  The WitnessArgs.lock placeholder bytes array size and the default value is 5000
 * @param ckbFeeRate(Optional)  The CKB transaction fee rate, default value is 1100
 * @param btcTestnetType(Optional)  The Bitcoin Testnet type including Testnet3 and Signet, default value is Testnet3
 */
export const genCkbJumpBtcVirtualTx = async ({
  collector,
  xudtTypeBytes,
  fromCkbAddress,
  toRgbppLockArgs,
  transferAmount,
  witnessLockPlaceholderSize,
  ckbFeeRate,
  btcTestnetType,
}: CkbJumpBtcVirtualTxParams): Promise<CKBComponents.RawTransaction> => {
  const isMainnet = fromCkbAddress.startsWith('ckb');
  const xudtType = blockchain.Script.unpack(xudtTypeBytes) as CKBComponents.Script;
  if (!isTypeAssetSupported(xudtType, isMainnet)) {
    throw new TypeAssetNotSupportedError('The type script asset is not supported now');
  }

  const fromLock = addressToScript(fromCkbAddress);

  const xudtCells = await collector.getCells({ lock: fromLock, type: xudtType });
  if (!xudtCells || xudtCells.length === 0) {
    throw new NoXudtLiveCellError('No rgbpp cells found with the xudt type script and the rgbpp lock args');
  }

  const collected = collector.collectUdtInputs({
    liveCells: xudtCells,
    needAmount: transferAmount,
  });

  let { inputs, sumInputsCapacity } = collected;
  const { sumAmount } = collected;

  const rpbppCellCapacity = calculateRgbppCellCapacity(xudtType);
  const outputsData = [append0x(u128ToLe(transferAmount))];

  const outputs: CKBComponents.CellOutput[] = [
    {
      lock: genRgbppLockScript(toRgbppLockArgs, isMainnet, btcTestnetType),
      type: xudtType,
      capacity: append0x(rpbppCellCapacity.toString(16)),
    },
  ];

  const txFee = MAX_FEE;
  const xudtCellCapacity = calculateUdtCellCapacity(fromLock, xudtType);
  if (sumInputsCapacity < xudtCellCapacity + rpbppCellCapacity + MIN_CAPACITY + txFee) {
    let emptyCells = await collector.getCells({ lock: fromLock });
    if (!emptyCells || emptyCells.length === 0) {
      throw new NoLiveCellError('The address has no empty cells');
    }
    emptyCells = emptyCells.filter((cell) => !cell.output.type);
    const { inputs: emptyInputs, sumInputsCapacity: sumEmptyCapacity } = collector.collectInputs(
      emptyCells,
      rpbppCellCapacity,
      txFee,
    );
    inputs = [...emptyInputs, ...inputs];
    sumInputsCapacity += sumEmptyCapacity;
  }

  let changeCapacity = sumInputsCapacity - rpbppCellCapacity - txFee;
  if (sumAmount > transferAmount) {
    outputs.push({
      lock: fromLock,
      type: xudtType,
      capacity: append0x(xudtCellCapacity.toString(16)),
    });
    outputsData.push(append0x(u128ToLe(sumAmount - transferAmount)));
    changeCapacity -= xudtCellCapacity;
  }
  outputs.push({
    lock: fromLock,
    capacity: append0x(changeCapacity.toString(16)),
  });
  outputsData.push('0x');

  const cellDeps = await fetchTypeIdCellDeps(isMainnet, { xudt: true });
  const witnesses = inputs.map(() => '0x');

  const ckbRawTx: CKBComponents.RawTransaction = {
    version: '0x0',
    cellDeps,
    headerDeps: [],
    inputs,
    outputs,
    outputsData,
    witnesses,
  };

  if (txFee === MAX_FEE) {
    const txSize = getTransactionSize(ckbRawTx) + (witnessLockPlaceholderSize ?? RGBPP_TX_WITNESS_MAX_SIZE);
    const estimatedTxFee = calculateTransactionFee(txSize, ckbFeeRate);
    const estimatedChangeCapacity = changeCapacity + (MAX_FEE - estimatedTxFee);
    ckbRawTx.outputs[ckbRawTx.outputs.length - 1].capacity = append0x(estimatedChangeCapacity.toString(16));
  }

  return ckbRawTx;
};

/**
 * Generate a virtual ckb transaction to realize a batch jump of assets from CKB to BTC
 * @param collector The collector that collects CKB live cells and transactions
 * @param xudtTypeBytes The serialized hex string of the XUDT type script
 * @param fromCkbAddress The from ckb address who will use his private key to sign the ckb tx
 * @param rgbppReceivers The rgbpp receiver list which include toRgbppLockArgs and transferAmount
 * @param witnessLockPlaceholderSize The WitnessArgs.lock placeholder bytes array size and the default value is 5000
 * @param ckbFeeRate The CKB transaction fee rate, default value is 1100
 */
export const genCkbBatchJumpBtcVirtualTx = async ({
  collector,
  xudtTypeBytes,
  fromCkbAddress,
  rgbppReceivers,
  witnessLockPlaceholderSize,
  ckbFeeRate,
  btcTestnetType,
}: CkbBatchJumpBtcVirtualTxParams): Promise<CKBComponents.RawTransaction> => {
  const isMainnet = fromCkbAddress.startsWith('ckb');
  const xudtType = blockchain.Script.unpack(xudtTypeBytes) as CKBComponents.Script;
  if (!isTypeAssetSupported(xudtType, isMainnet)) {
    throw new TypeAssetNotSupportedError('The type script asset is not supported now');
  }

  const fromLock = addressToScript(fromCkbAddress);

  const xudtCells = await collector.getCells({ lock: fromLock, type: xudtType });
  if (!xudtCells || xudtCells.length === 0) {
    throw new NoXudtLiveCellError('No rgbpp cells found with the xudt type script and the rgbpp lock args');
  }

  const sumTransferAmount = rgbppReceivers
    .map((receiver) => receiver.transferAmount)
    .reduce((prev, current) => prev + current, BigInt(0));

  const collected = collector.collectUdtInputs({
    liveCells: xudtCells,
    needAmount: sumTransferAmount,
  });

  let { inputs, sumInputsCapacity } = collected;
  const { sumAmount } = collected;

  const rpbppCellCapacity = calculateRgbppCellCapacity(xudtType);
  const sumRgbppCellCapacity = rpbppCellCapacity * BigInt(rgbppReceivers.length);
  const outputs: CKBComponents.CellOutput[] = rgbppReceivers.map((receiver) => ({
    lock: genRgbppLockScript(receiver.toRgbppLockArgs, isMainnet, btcTestnetType),
    type: xudtType,
    capacity: append0x(rpbppCellCapacity.toString(16)),
  }));
  const outputsData = rgbppReceivers.map((receiver) => append0x(u128ToLe(receiver.transferAmount)));

  const txFee = MAX_FEE;
  const xudtCellCapacity = calculateUdtCellCapacity(fromLock, xudtType);
  if (sumInputsCapacity < xudtCellCapacity + sumRgbppCellCapacity + MIN_CAPACITY + txFee) {
    let emptyCells = await collector.getCells({ lock: fromLock });
    if (!emptyCells || emptyCells.length === 0) {
      throw new NoLiveCellError('The address has no empty cells');
    }
    emptyCells = emptyCells.filter((cell) => !cell.output.type);
    const { inputs: emptyInputs, sumInputsCapacity: sumEmptyCapacity } = collector.collectInputs(
      emptyCells,
      rpbppCellCapacity,
      txFee,
    );
    inputs = [...emptyInputs, ...inputs];
    sumInputsCapacity += sumEmptyCapacity;
  }

  let changeCapacity = sumInputsCapacity - sumRgbppCellCapacity - txFee;
  if (sumAmount > sumTransferAmount) {
    outputs.push({
      lock: fromLock,
      type: xudtType,
      capacity: append0x(xudtCellCapacity.toString(16)),
    });
    outputsData.push(append0x(u128ToLe(sumAmount - sumTransferAmount)));
    changeCapacity -= xudtCellCapacity;
  }
  outputs.push({
    lock: fromLock,
    capacity: append0x(changeCapacity.toString(16)),
  });
  outputsData.push('0x');

  const cellDeps = await fetchTypeIdCellDeps(isMainnet, { xudt: true });
  const witnesses = inputs.map(() => '0x');

  const ckbRawTx: CKBComponents.RawTransaction = {
    version: '0x0',
    cellDeps,
    headerDeps: [],
    inputs,
    outputs,
    outputsData,
    witnesses,
  };

  if (txFee === MAX_FEE) {
    const txSize = getTransactionSize(ckbRawTx) + (witnessLockPlaceholderSize ?? RGBPP_TX_WITNESS_MAX_SIZE);
    const estimatedTxFee = calculateTransactionFee(txSize, ckbFeeRate);
    const estimatedChangeCapacity = changeCapacity + (MAX_FEE - estimatedTxFee);
    ckbRawTx.outputs[ckbRawTx.outputs.length - 1].capacity = append0x(estimatedChangeCapacity.toString(16));
  }

  return ckbRawTx;
};
