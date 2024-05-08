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
  // The WitnessArgs.lock placeholder bytes array size and the default value is 5000
  witnessLockPlaceholderSize?: number;
  // The CKB transaction fee rate, default value is 1100
  ckbFeeRate?: bigint;
}

export interface RgbppBtcAddressReceiver {
  // The BTC address
  toBtcAddress: string;
  // The XUDT amount to be transferred
  transferAmount: bigint;
}

export interface BtcBatchTransferVirtualTxParams {
  // The collector that collects CKB live cells and transactions
  collector: Collector;
  // The serialized hex string of the XUDT type script
  xudtTypeBytes: Hex;
  // The rgbpp assets cell lock script args array whose data structure is: out_index | bitcoin_tx_id
  rgbppLockArgsList: Hex[];
  // The rgbpp receiver list which include toRgbppLockArgs and transferAmount
  rgbppReceivers: RgbppBtcAddressReceiver[];
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

export interface BtcBatchTransferVirtualTxResult extends BaseCkbVirtualTxResult {
  rgbppChangeOutIndex: number;
}

export interface RgbppLaunchVirtualTxResult {
  // CKB raw transaction
  ckbRawTx: CKBComponents.RawTransaction;
  // The rgbpp commitment to be inserted into BTC op_return
  commitment: Hex;
}

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
  // The CKB transaction fee rate, default value is 1100
  ckbFeeRate?: bigint;
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
  // [u64; 2], filter cells by output capacity range, [inclusive, exclusive]
  outputCapacityRange?: Hex[];
  // The CKB transaction fee rate, default value is 1100
  ckbFeeRate?: bigint;
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
  // The WitnessArgs.lock placeholder bytes array size and the default value is 5000
  witnessLockPlaceholderSize?: number;
  // The CKB transaction fee rate, default value is 1100
  ckbFeeRate?: bigint;
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

export interface RgbppLockArgsReceiver {
  // The receiver rgbpp lock script args whose data structure is: out_index | bitcoin_tx_id
  toRgbppLockArgs: Hex;
  // The XUDT amount to be transferred
  transferAmount: bigint;
}

export interface CkbBatchJumpBtcVirtualTxParams {
  // The collector that collects CKB live cells and transactions
  collector: Collector;
  // The serialized hex string of the XUDT type script
  xudtTypeBytes: Hex;
  // The from ckb address who will use his private key to sign the ckb tx
  fromCkbAddress: Address;
  // The rgbpp receiver list which include toRgbppLockArgs and transferAmount
  rgbppReceivers: RgbppLockArgsReceiver[];
  // The WitnessArgs.lock placeholder bytes array size and the default value is 5000
  witnessLockPlaceholderSize?: number;
  // The CKB transaction fee rate, default value is 1100
  ckbFeeRate?: bigint;
}

export interface AppendIssuerCellToBtcBatchTransfer {
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

/**
 * @see {@link https://github.com/ckb-cell/unique-cell?tab=readme-ov-file#xudt-information} for the definition of xUDT information
 */
export interface RgbppTokenInfo {
  // The number of decimals the RGBPP token uses
  decimal: number;
  // The name of the RGBPP token, and maximum number of characters is 255
  name: string;
  // The symbol of the RGBPP token, and maximum number of characters is 255
  symbol: string;
}

export interface RgbppLaunchCkbVirtualTxParams {
  // The collector that collects CKB live cells and transactions
  collector: Collector;
  // The owner RGBPP lock args whose data structure is: out_index | bitcoin_tx_id
  ownerRgbppLockArgs: Address;
  // The total amount of RGBPP assets issued
  launchAmount: bigint;
  // The RGBPP token info https://github.com/ckb-cell/unique-cell?tab=readme-ov-file#xudt-information
  rgbppTokenInfo: RgbppTokenInfo;
  // The WitnessArgs.lock placeholder bytes array size and the default value is 5000
  witnessLockPlaceholderSize?: number;
  // The CKB transaction fee rate, default value is 1100
  ckbFeeRate?: bigint;
  isMainnet: boolean;
}
