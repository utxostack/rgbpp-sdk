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

export interface BtcRgbppTransfer {
  transferAmount: bigint;
  btcAddress: Address;
}

export interface RgbppL1TransferVirtualParams {
  collector: Collector;
  xudtTypeBytes: Hex;
  rgbppLockArgsList: Hex[];
  transferAmount: bigint;
  isMainnet?: boolean;
}

export interface RgbppL1TransferVirtualTx {
  inputs: CKBComponents.CellInput[];
  outputs: CKBComponents.CellOutput[];
  outputsData: Hex[];
}

export interface RgbppL1TransferVirtualResult {
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
}

export interface SendTxParams {
  collector: Collector;
  signedTx: CKBComponents.RawTransaction;
}
