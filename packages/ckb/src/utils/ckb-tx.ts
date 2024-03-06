import BigNumber from 'bignumber.js';

export const calculateTransactionFee = (txSize: number): bigint => {
  const ratio = BigNumber(1000);
  const defaultFeeRate = BigNumber(1100);
  const fee = BigNumber(txSize).multipliedBy(defaultFeeRate).div(ratio);
  return BigInt(fee.toFixed(0, BigNumber.ROUND_CEIL).toString());
};
