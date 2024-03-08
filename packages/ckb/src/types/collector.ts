import { Capacity, Hex } from './common';

export interface IndexerCell {
  blockNumber: CKBComponents.BlockNumber;
  outPoint: CKBComponents.OutPoint;
  output: CKBComponents.CellOutput;
  outputData: Hex;
  txIndex: Hex;
}

export interface IndexerCapacity {
  blockNumber: CKBComponents.BlockNumber;
  blockHash: CKBComponents.Hash;
  capacity: Hex;
}

export interface CollectResult {
  inputs: CKBComponents.CellInput[];
  sumInputsCapacity: Capacity;
}

export interface CollectUdtResult extends CollectResult {
  sumAmount: bigint;
}
