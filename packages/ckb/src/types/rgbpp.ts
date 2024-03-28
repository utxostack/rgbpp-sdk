import { BtcAssetsApi, RgbppApiSpvProof } from '@rgbpp-sdk/service';
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
  // The XUDT amount to be transferred, if the noMergeOutputCells is true, the transferAmount will be ignored
  transferAmount: bigint;
  isMainnet: boolean;
  // The noMergeOutputCells indicates whether the CKB outputs need to be merged. By default, the outputs will be merged.
  noMergeOutputCells?: boolean;
}

export interface RgbppCkbVirtualTx {
  // The rgbpp inputs whose lock scripts must be rgbpp lock and type scripts must be XUDT type
  inputs: CKBComponents.CellInput[];
  // The rgbpp outputs whose lock scripts must be rgbpp lock or btc time lock and type scripts must be XUDT type
  outputs: CKBComponents.CellOutput[];
  // The outputsData must be XUDT cell data(16bytes XUDT amount)
  outputsData: Hex[];
}

export interface BaseCkbVirtualTxResult {
  // CKB raw transaction
  ckbRawTx: CKBComponents.RawTransaction;
  // The rgbpp commitment to be inserted into BTC op_return
  commitment: Hex;
  // The needPaymasterCell indicates whether a paymaster cell is required
  needPaymasterCell: boolean;
  // The sum capacity of the ckb inputs
  sumInputsCapacity: Hex;
}

export interface BtcTransferVirtualTxResult extends BaseCkbVirtualTxResult {}

export interface AppendWitnessesParams {
  // CKB raw transaction
  ckbRawTx: CKBComponents.RawTransaction;
  // The SPV client cell and tx proof which is from BTCAssetsApi
  rgbppApiSpvProof: RgbppApiSpvProof;
  // The hex string of btc transaction, refer to https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/ts_src/transaction.ts#L609
  btcTxBytes: Hex;
}

export interface AppendPaymasterCellAndSignTxParams {
  // The Secp256k1 private key of the paymaster cells maintainer
  secp256k1PrivateKey: Hex;
  // CKB raw transaction
  ckbRawTx: CKBComponents.RawTransaction;
  // The sum capacity of the ckb inputs
  sumInputsCapacity: Hex;
  // The paymaster cell to be inserted into CKB transaction to pay an extra output cell
  paymasterCell: IndexerCell;
  isMainnet: boolean;
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

export interface BtcJumpCkbVirtualTxResult extends BaseCkbVirtualTxResult {}

export interface BtcTimeCellsParams {
  // The BTC time cells
  btcTimeCells: IndexerCell[];
  // BTC Assets Api
  btcAssetsApi: BtcAssetsApi;
  isMainnet: boolean;
}

export interface SignBtcTimeCellsTxParams {
  // The Secp256k1 private key of the master address
  secp256k1PrivateKey: Hex;
  // CKB raw transaction
  ckbRawTx: CKBComponents.RawTransaction;
  // The collector that collects CKB live cells and transactions
  collector: Collector;
  // The master CKB address to pay the time cells spent tx fee
  masterCkbAddress: Address;
  isMainnet: boolean;
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

export interface UpdateCkbTxWithRealBtcTxIdParams {
  // CKB raw transaction
  ckbRawTx: CKBComponents.RawTransaction;
  // The BTC transaction id
  btcTxId: Hex;
  isMainnet: boolean;
}

export interface BtcTimeCellStatusParams {
  // The collector that collects CKB live cells and transactions
  collector: Collector;
  // The ckb address who is the receiver of the btc time lock args
  ckbAddress: Address;
  // The BTC transaction id
  btcTxId: Hex;
}
