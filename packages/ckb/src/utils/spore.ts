import { TransactionSkeletonType, createTransactionFromSkeleton } from '@ckb-lumos/helpers';

export const ckbTxFromTxSkeleton = (txSkeleton: TransactionSkeletonType): CKBComponents.RawTransaction => {
  return createTransactionFromSkeleton(txSkeleton) as CKBComponents.RawTransaction;
};
