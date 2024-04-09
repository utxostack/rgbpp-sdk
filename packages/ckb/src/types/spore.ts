import { createCluster, createSpore, transferSpore } from '@spore-sdk/core';
import { Hex } from './common';

export interface CreateClusterCkbVirtualTxParams {
  // The TransactionSkeletonType is from @ckb-lumos/helpers
  clusterParams: Parameters<typeof createCluster>[0];
  // The WitnessArgs.lock placeholder bytes array size and the default value is 3000(It can make most scenarios work properly)
  witnessLockPlaceholderSize?: number;
  // The CKB transaction fee rate, default value is 1100
  ckbFeeRate?: bigint;
}

export interface SporeVirtualTxResult {
  // CKB raw transaction
  ckbRawTx: CKBComponents.RawTransaction;
  // The rgbpp commitment to be inserted into BTC op_return
  commitment: Hex;
  // The ID of the cluster to be assigned to the spore. The cluster's ID is equivalent to the type script args of the cluster
  clusterId?: Hex;
}

export interface CreateSporeCkbVirtualTxParams {
  // The TransactionSkeletonType is from @ckb-lumos/helpers
  sporeParams: Parameters<typeof createSpore>[0];
  // The WitnessArgs.lock placeholder bytes array size and the default value is 3000(It can make most scenarios work properly)
  witnessLockPlaceholderSize?: number;
  // The CKB transaction fee rate, default value is 1100
  ckbFeeRate?: bigint;
}

export interface TransferSporeCkbVirtualTxParams {
  // The TransactionSkeletonType is from @ckb-lumos/helpers
  sporeParams: Parameters<typeof transferSpore>[0];
  // The WitnessArgs.lock placeholder bytes array size and the default value is 3000(It can make most scenarios work properly)
  witnessLockPlaceholderSize?: number;
  // The CKB transaction fee rate, default value is 1100
  ckbFeeRate?: bigint;
}
