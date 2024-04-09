import { TransactionSkeletonType } from '@ckb-lumos/helpers';

export const ckbTxFromTxSkeleton = (txSkeleton: TransactionSkeletonType): CKBComponents.RawTransaction => {
  const ckbTx: CKBComponents.RawTransaction = {
    version: '0x',
    headerDeps: txSkeleton.headerDeps.toArray(),
    cellDeps: txSkeleton.cellDeps.toArray(),
    inputs: txSkeleton.inputs.toArray().map((cell) => ({
      previousOutput: cell.outPoint!,
      since: '0x0',
    })),
    outputs: txSkeleton.outputs.toArray().map((cell) => cell.cellOutput),
    outputsData: txSkeleton.outputs.toArray().map((cell) => cell.data),
    witnesses: txSkeleton.witnesses.toArray(),
  };
  return ckbTx;
};
