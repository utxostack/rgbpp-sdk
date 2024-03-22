import { Collector } from '../collector';
import { SPVService } from '../spv';
import { IndexerCell } from './collector';
import { Address, Hex } from './common';
import { SpvClientCellTxProofResponse } from './spv';

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
  isMainnet: boolean;
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
  // SPV RPC service
  spvService: SPVService;
  // The hex string of btc transaction, refer to https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/ts_src/transaction.ts#L609
  btcTxBytes: Hex;
  // The BTC transaction id
  btcTxId: Hex;
  // The position of this BTC transaction in the block
  btcTxIndexInBlock: number;
  // The sum capacity of the ckb inputs
  sumInputsCapacity: Hex;
  // The needPaymasterCell indicates whether a paymaster cell is required
  needPaymasterCell: boolean;
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

export interface BtcTimeCellPair {
  // The BTC time cell
  btcTimeCell: IndexerCell;
  // The position of this BTC transaction in the block
  btcTxIndexInBlock: number;
}

export interface BtcTimeCellsParams {
  // The pairs of the BTC time cell and the related btc tx(which is in the BTC time cell lock args) index in the block
  btcTimeCellPairs: BtcTimeCellPair[];
  // SPV RPC service
  spvService: SPVService;
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
