import BigNumber from 'bignumber.js';
import { remove0x } from './hex';
import { CKB_UNIT } from '../constants';

export const calculateTransactionFee = (txSize: number): bigint => {
  const ratio = BigNumber(1000);
  const defaultFeeRate = BigNumber(1100);
  const fee = BigNumber(txSize).multipliedBy(defaultFeeRate).div(ratio);
  return BigInt(fee.toFixed(0, BigNumber.ROUND_CEIL).toString());
};

// minimum occupied capacity and 1 ckb for transaction fee
// assume UDT cell data size is 16bytes
/**
 * RGB_lock:
    code_hash: 
      RGB_lock
    args:
      out_index | bitcoin_tx_id
 */
const RGBPP_LOCK_SIZE = 32 + 1 + 36;
export const calculateRgbppCellCapacity = (xudtType: CKBComponents.Script): bigint => {
  const typeArgsSize = remove0x(xudtType.args).length / 2;
  const udtTypeSize = 33 + typeArgsSize;
  const cellSize = RGBPP_LOCK_SIZE + udtTypeSize + 8 + 16;
  return BigInt(cellSize + 1) * CKB_UNIT;
};

// minimum occupied capacity and 1 ckb for transaction fee
// assume UDT cell data size is 16bytes
export const calculateUdtCellCapacity = (lock: CKBComponents.Script, udtType: CKBComponents.Script): bigint => {
  const lockArgsSize = remove0x(lock.args).length / 2;
  const typeArgsSize = remove0x(udtType.args).length / 2;
  const cellSize = 33 + lockArgsSize + 33 + typeArgsSize + 8 + 16;
  return BigInt(cellSize + 1) * CKB_UNIT;
};
