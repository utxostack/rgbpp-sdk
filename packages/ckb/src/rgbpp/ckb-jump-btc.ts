import { CkbJumpBtcVirtualTxParams } from '../types/rgbpp';
import { blockchain } from '@ckb-lumos/base';
import { NoLiveCellError, NoXudtLiveCellError, TypeAssetNotSupportedError } from '../error';
import {
  append0x,
  calculateRgbppCellCapacity,
  calculateTransactionFee,
  calculateUdtCellCapacity,
  isTypeAssetSupported,
  u128ToLe,
} from '../utils';
import { genRgbppLockScript } from '../utils/rgbpp';
import { MAX_FEE, MIN_CAPACITY, RGBPP_TX_WITNESS_MAX_SIZE, getXudtDep } from '../constants';
import { addressToScript, getTransactionSize } from '@nervosnetwork/ckb-sdk-utils';

/**
 * Generate the virtual ckb transaction for the jumping tx from CKB to BTC
 * @param collector The collector that collects CKB live cells and transactions
 * @param xudtTypeBytes The serialized hex string of the XUDT type script
 * @param fromCkbAddress The from ckb address who will use his private key to sign the ckb tx
 * @param toRgbppLockArgs The receiver rgbpp lock script args whose data structure is: out_index | bitcoin_tx_id
 * @param transferAmount The XUDT amount to be transferred
 * @param witnessLockPlaceholderSize The WitnessArgs.lock placeholder bytes array size and the default value is 3000(It can make most scenarios work properly)
 * @param isMainnet
 */
export const genCkbJumpBtcVirtualTx = async ({
  collector,
  xudtTypeBytes,
  fromCkbAddress,
  toRgbppLockArgs,
  transferAmount,
  witnessLockPlaceholderSize,
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

  let { inputs, sumInputsCapacity, sumAmount } = collector.collectUdtInputs({
    liveCells: xudtCells,
    needAmount: transferAmount,
  });

  const rpbppCellCapacity = calculateRgbppCellCapacity(xudtType);
  const outputsData = [append0x(u128ToLe(transferAmount))];

  const outputs: CKBComponents.CellOutput[] = [
    {
      lock: genRgbppLockScript(toRgbppLockArgs, isMainnet),
      type: xudtType,
      capacity: append0x(rpbppCellCapacity.toString(16)),
    },
  ];

  let txFee = MAX_FEE;
  const xudtCellCapacity = calculateUdtCellCapacity(fromLock, xudtType);
  if (sumInputsCapacity < xudtCellCapacity + rpbppCellCapacity + MIN_CAPACITY + txFee) {
    const emptyCells = await collector.getCells({ lock: fromLock });
    if (!emptyCells || emptyCells.length === 0) {
      throw new NoLiveCellError('The address has no empty cells');
    }
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

  const cellDeps = [getXudtDep(isMainnet)];
  const witnesses = inputs.map((_) => '0x');

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
    const estimatedTxFee = calculateTransactionFee(txSize);
    const estimatedChangeCapacity = changeCapacity + (MAX_FEE - estimatedTxFee);
    ckbRawTx.outputs[ckbRawTx.outputs.length - 1].capacity = append0x(estimatedChangeCapacity.toString(16));
  }

  return ckbRawTx;
};
