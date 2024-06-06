import { DataSource } from '@rgbpp-sdk/btc';
import { BtcTransferVirtualTxResult, Collector, Hex } from '@rgbpp-sdk/ckb';

export interface RgbppTransferCkb {
  // The collector that collects CKB live cells and transactions
  collector: Collector;
  // The transferred RGB++ xUDT type script args
  xudtTypeArgs: Hex;
  // The rgbpp assets cell lock script args array whose data structure is: out_index | bitcoin_tx_id
  rgbppLockArgsList: Hex[];
  // The XUDT amount to be transferred, if the noMergeOutputCells is true, the transferAmount will be ignored
  transferAmount: bigint;
  // The CKB transaction fee rate, default value is 1100
  ckbFeeRate?: bigint;
}

export interface RgbppTransferBtc {
  // The sender BTC address
  fromBtcAddress: string;
  // The receiver BTC address
  toBtcAddress: string;
  btcDataSource: DataSource;
  // The public key of sender BTC address
  fromPubkey?: Hex;
  // The fee rate of the BTC transaction
  feeRate?: number;
}

export interface RgbppTransferTxParams {
  ckb: RgbppTransferCkb;
  btc: RgbppTransferBtc;
  isMainnet: boolean;
}

export interface RgbppTransferTxResult {
  ckbVirtualTxResult: BtcTransferVirtualTxResult;
  // The BTC PSBT hex string which can be used to construct Bitcoin PSBT
  btcPsbtHex: Hex;
}
