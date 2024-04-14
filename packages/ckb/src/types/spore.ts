import { RawClusterData, RawSporeData, transferSpore } from '@spore-sdk/core';
import { Address, Hex } from './common';
import { Collector } from '../collector';

export interface CreateClusterCkbVirtualTxParams {
  // The collector that collects CKB live cells and transactions
  collector: Collector;
  // The rgbpp assets cell lock script args whose data structure is: out_index | bitcoin_tx_id
  rgbppLockArgs: Hex;
  // The cluster's data, including name and description.
  clusterData: RawClusterData;
  isMainnet: boolean;
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
  // The collector that collects CKB live cells and transactions
  collector: Collector;
  // The cluster rgbpp cell lock script args whose data structure is: out_index | bitcoin_tx_id
  clusterRgbppLockArgs: Hex;
  // The cluster's data, including name and description.
  sporeDataList: RawSporeData[];
  isMainnet: boolean;
  // The WitnessArgs.lock placeholder bytes array size and the default value is 3000(It can make most scenarios work properly)
  witnessLockPlaceholderSize?: number;
  // The CKB transaction fee rate, default value is 1100
  ckbFeeRate?: bigint;
}

export interface SporeCreateVirtualTxResult {
  // CKB raw transaction
  ckbRawTx: CKBComponents.RawTransaction;
  // The rgbpp commitment to be inserted into BTC op_return
  commitment: Hex;
  // The sum capacity of the ckb inputs
  sumInputsCapacity: Hex;
}

export interface AppendIssuerCellToSporeCreate {
  // The Secp256k1 private key of the issuer cells maintainer
  secp256k1PrivateKey: Hex;
  // The issuer ckb address
  issuerAddress: Address;
  // The collector that collects CKB live cells and transactions
  collector: Collector;
  // CKB raw transaction
  ckbRawTx: CKBComponents.RawTransaction;
  // The sum capacity of the ckb inputs
  sumInputsCapacity: Hex;
  isMainnet: boolean;
  // The CKB transaction fee rate, default value is 1100
  ckbFeeRate?: bigint;
}
