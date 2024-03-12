import { CkbJumpBtcVirtualTxParams, CkbJumpBtcVirtualTxResult, RgbppCkbVirtualTx } from '../types/rgbpp';
import { blockchain } from '@ckb-lumos/base';
import { NoXudtLiveCellError } from '../error';
import { append0x, calculateRgbppCellCapacity, calculateTransactionFee, u128ToLe, u32ToLe } from '../utils';
import { calculateCommitment, genRgbppLockScript } from '../utils/rgbpp';
import { MAX_FEE, SECP256K1_WITNESS_LOCK_LEN, getXudtDep } from '../constants';
import { addressToScript, getTransactionSize } from '@nervosnetwork/ckb-sdk-utils';

export const genCkbJumpBtcVirtualTx = async ({
  collector,
  xudtTypeBytes,
  fromCkbAddress,
  transferAmount,
  witnessLockPlaceholderSize,
}: CkbJumpBtcVirtualTxParams): Promise<CkbJumpBtcVirtualTxResult> => {
  const isMainnet = fromCkbAddress.startsWith('ckb');
  const xudtType = blockchain.Script.unpack(xudtTypeBytes) as CKBComponents.Script;
  const fromLock = addressToScript(fromCkbAddress);

  const xudtCells = await collector.getCells({ lock: fromLock, type: xudtType });
  if (!xudtCells || xudtCells.length === 0) {
    throw new NoXudtLiveCellError('No rgb++ cells found with the xudt type script and the rgbpp lock args');
  }

  const { inputs, sumInputsCapacity, sumAmount } = collector.collectUdtInputs(xudtCells, transferAmount);

  const rpbppCellCapacity = calculateRgbppCellCapacity(xudtType);
  const outputsData = [append0x(u128ToLe(transferAmount))];

  const outputs: CKBComponents.CellOutput[] = [
    {
      lock: genRgbppLockScript(u32ToLe(1), isMainnet),
      type: xudtType,
      capacity: append0x(rpbppCellCapacity.toString(16)),
    },
  ];

  let txFee = MAX_FEE;
  const changeCapacity = sumInputsCapacity - rpbppCellCapacity - txFee;
  outputs.push({
    lock: fromLock,
    type: xudtType,
    capacity: append0x(changeCapacity.toString(16)),
  });
  outputsData.push(append0x(u128ToLe(sumAmount - transferAmount)));

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
    const txSize = getTransactionSize(ckbRawTx) + (witnessLockPlaceholderSize ?? SECP256K1_WITNESS_LOCK_LEN);
    const estimatedTxFee = calculateTransactionFee(txSize);
    const estimatedChangeCapacity = changeCapacity + (MAX_FEE - estimatedTxFee);
    ckbRawTx.outputs[ckbRawTx.outputs.length - 1].capacity = append0x(estimatedChangeCapacity.toString(16));
  }

  const virtualTx: RgbppCkbVirtualTx = {
    inputs,
    outputs,
    outputsData,
  };
  const commitment = calculateCommitment(virtualTx);

  return {
    ckbRawTx,
    commitment,
  };
};
