import { Collector } from '../collector';
import { IndexerCell } from './collector';
import { Address, Hex } from './common';

export interface ConstructPaymasterParams {
  collector: Collector;
  masterPrivateKey: Hex;
  receiverAddress: Address;
  // The unit is CKB
  capacityWithCKB: number;
  cellAmount: number;
}

export interface BtcTransferVirtualTxParams {
  collector: Collector;
  xudtTypeBytes: Hex;
  rgbppLockArgsList: Hex[];
  transferAmount: bigint;
  isMainnet?: boolean;
}

export interface RgbppCkbVirtualTx {
  inputs: CKBComponents.CellInput[];
  outputs: CKBComponents.CellOutput[];
  outputsData: Hex[];
}

export interface BtcTransferVirtualTxResult {
  ckbRawTx: CKBComponents.RawTransaction;
  commitment: Hex;
  needPaymasterCell: boolean;
  sumInputsCapacity: bigint;
}

export interface AppendWitnessesParams {
  ckbRawTx: CKBComponents.RawTransaction;
  sumInputsCapacity: bigint;
  needPaymasterCell: boolean;
}

export interface AppendPaymasterCellAndSignTxParams {
  secp256k1PrivateKey: Hex;
  ckbRawTx: CKBComponents.RawTransaction;
  sumInputsCapacity: bigint;
  paymasterCell: IndexerCell;
  isMainnet?: boolean;
}

export interface SendCkbTxParams {
  collector: Collector;
  signedTx: CKBComponents.RawTransaction;
}

export interface BtcJumpCkbVirtualTxParams extends BtcTransferVirtualTxParams {
  toCkbAddress: Address;
}

export interface BtcJumpCkbVirtualTxResult {
  ckbRawTx: CKBComponents.RawTransaction;
  commitment: Hex;
  needPaymasterCell: boolean;
  sumInputsCapacity: bigint;
}

export interface BtcTimeCellsParams {
  collector: Collector;
  xudtType: CKBComponents.Script;
  cellCount: number;
  isMainnet?: boolean;
}
