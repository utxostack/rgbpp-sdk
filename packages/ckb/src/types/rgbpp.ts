import { Collector } from '../collector';
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
