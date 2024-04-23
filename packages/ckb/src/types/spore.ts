import { RawClusterData, RawSporeData, transferSpore } from '@spore-sdk/core';
import { Address, Hex } from './common';
import { Collector } from '../collector';
import { IndexerCell } from './collector';

export interface CreateClusterCkbVirtualTxParams {
  // The collector that collects CKB live cells and transactions
  collector: Collector;
  // The rgbpp assets cell lock script args whose data structure is: out_index | bitcoin_tx_id
  rgbppLockArgs: Hex;
  // The cluster's data, including name and description.
  clusterData: RawClusterData;
  isMainnet: boolean;
  // The WitnessArgs.lock placeholder bytes array size and the default value is 5000
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
  // The WitnessArgs.lock placeholder bytes array size and the default value is 5000
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
  // The cluster cell from ckb-indexer
  clusterCell: IndexerCell;
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

export interface SporesCreateCobuildParams {
  sporeOutputs: CKBComponents.CellOutput[];
  sporeOutputsData: Hex[];
  clusterCell: IndexerCell;
  clusterOutputCell: CKBComponents.CellOutput;
}

export interface TransferSporeCkbVirtualTxParams {
  // The collector that collects CKB live cells and transactions
  collector: Collector;
  // The spore rgbpp cell lock script args whose data structure is: out_index | bitcoin_tx_id
  sporeRgbppLockArgs: Hex;
  // The spore type script serialized bytes
  sporeTypeBytes: Hex;
  isMainnet: boolean;
  // The WitnessArgs.lock placeholder bytes array size and the default value is 5000
  witnessLockPlaceholderSize?: number;
  // The CKB transaction fee rate, default value is 1100
  ckbFeeRate?: bigint;
}

export interface SporeTransferVirtualTxResult {
  // CKB raw transaction
  ckbRawTx: CKBComponents.RawTransaction;
  // The rgbpp commitment to be inserted into BTC op_return
  commitment: Hex;
  // The spore cell from ckb-indexer
  sporeCell: IndexerCell;
  // The needPaymasterCell indicates whether a paymaster cell is required
  needPaymasterCell: boolean;
  // The sum capacity of the ckb inputs
  sumInputsCapacity: Hex;
}
