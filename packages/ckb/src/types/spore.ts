import { createCluster } from '@spore-sdk/core';
import { Collector } from '../collector';
import { BaseCkbVirtualTxResult } from './rgbpp';
import { Hex } from './common';

export interface CreateClusterCkbVirtualTxParams {
  // The collector that collects CKB live cells and transactions
  collector: Collector;
  // The rgbpp assets cell lock script args array whose data structure is: out_index | bitcoin_tx_id
  rgbppLockArgsList: Hex[];
  // The TransactionSkeletonType is from @ckb-lumos/helpers
  clusterParams: Parameters<typeof createCluster>[0];
  isMainnet: boolean;
  // The WitnessArgs.lock placeholder bytes array size and the default value is 3000(It can make most scenarios work properly)
  witnessLockPlaceholderSize?: number;
  // The CKB transaction fee rate, default value is 1100
  ckbFeeRate?: bigint;
}

export interface SporeVirtualTxResult extends BaseCkbVirtualTxResult {}
