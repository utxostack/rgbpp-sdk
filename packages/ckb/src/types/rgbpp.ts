import { Collector } from '../collector';
import { IndexerCell } from './collector';
import { Address, Hex } from './common';

export interface ConstructPaymasterParams {
  // The collector that collects CKB live cells and transactions
  collector: Collector;
  // The Secp256k1 private key of the cold key maintainer
  masterPrivateKey: Hex;
  // The ckb address of paymaster cells maintainer
  receiverAddress: Address;
  // The Capacity(the unit is CKB) of each paymaster cell
  capacityWithCKB: number;
  // The amount of paymaster cells to be produced
  cellAmount: number;
}

export interface BtcTransferVirtualTxParams {
  // The collector that collects CKB live cells and transactions
  collector: Collector;
  // The serialized hex string of the XUDT type script
  xudtTypeBytes: Hex;
  // The rgbpp assets cell lock script args array whose data structure is: out_index | bitcoin_tx_id
  rgbppLockArgsList: Hex[];
  // The XUDT amount to be transferred
  transferAmount: bigint;
  isMainnet?: boolean;
}

export interface RgbppCkbVirtualTx {
  // The rgbpp inputs whose lock scripts must be rgbpp lock and type scripts must be XUDT type
  inputs: CKBComponents.CellInput[];
  // The rgbpp outputs whose lock scripts must be rgbpp lock or btc time lock and type scripts must be XUDT type
  outputs: CKBComponents.CellOutput[];
  // The outputsData must be XUDT cell data(16bytes XUDT amount)
  outputsData: Hex[];
}

export interface BtcTransferVirtualTxResult {
  // CKB raw transaction
  ckbRawTx: CKBComponents.RawTransaction;
  // The rgbpp commitment to be inserted into BTC op_return
  commitment: Hex;
  // The needPaymasterCell indicates whether a paymaster cell is required
  needPaymasterCell: boolean;
  // The sum capacity of the ckb inputs
  sumInputsCapacity: bigint;
}

export interface AppendWitnessesParams {
  // CKB raw transaction
  ckbRawTx: CKBComponents.RawTransaction;
  // The sum capacity of the ckb inputs
  sumInputsCapacity: bigint;
  // The needPaymasterCell indicates whether a paymaster cell is required
  needPaymasterCell: boolean;
}

export interface AppendPaymasterCellAndSignTxParams {
  // The Secp256k1 private key of the paymaster cells maintainer
  secp256k1PrivateKey: Hex;
  // CKB raw transaction
  ckbRawTx: CKBComponents.RawTransaction;
  // The sum capacity of the ckb inputs
  sumInputsCapacity: bigint;
  // The paymaster cell to be inserted into CKB transaction to pay an extra output cell
  paymasterCell: IndexerCell;
  isMainnet?: boolean;
}

export interface SendCkbTxParams {
  // The collector that collects CKB live cells and transactions
  collector: Collector;
  // The signed CKB transaction which can be sent to CKB blockchain node
  signedTx: CKBComponents.RawTransaction;
}

export interface BtcJumpCkbVirtualTxParams extends BtcTransferVirtualTxParams {
  // The receiver ckb address
  toCkbAddress: Address;
}

export interface BtcJumpCkbVirtualTxResult {
  // CKB raw transaction
  ckbRawTx: CKBComponents.RawTransaction;
  // The rgbpp commitment to be inserted into BTC op_return
  commitment: Hex;
  // The needPaymasterCell indicates whether a paymaster cell is required
  needPaymasterCell: boolean;
  // The sum capacity of the ckb inputs
  sumInputsCapacity: bigint;
}

export interface BtcTimeCellsParams {
  // The collector that collects CKB live cells and transactions
  btcTimeCells: IndexerCell[];
  isMainnet?: boolean;
}

export interface CkbJumpBtcVirtualTxParams {
  // The collector that collects CKB live cells and transactions
  collector: Collector;
  // The serialized hex string of the XUDT type script
  xudtTypeBytes: Hex;
  // The from ckb address who will use his private key to sign the ckb tx
  fromCkbAddress: Address;
  // The receiver rgbpp lock script args whose data structure is: out_index | bitcoin_tx_id
  toRgbppLockArgs: Hex;
  // The XUDT amount to be transferred
  transferAmount: bigint;
  // The WitnessArgs.lock placeholder bytes array size and the default value is 65(official secp256k1/blake160 lock)
  witnessLockPlaceholderSize?: number;
}

export interface CkbJumpBtcVirtualTxResult {
  // CKB raw transaction
  ckbRawTx: CKBComponents.RawTransaction;
  // The rgbpp commitment to be inserted into BTC op_return
  commitment: Hex;
}
