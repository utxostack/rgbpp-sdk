import { DataSource } from '@rgbpp-sdk/btc';
import { BtcTransferVirtualTxResult, Collector, Hex } from '@rgbpp-sdk/ckb';

export interface RgbppTransferTxParams {
  // The collector that collects CKB live cells and transactions
  collector: Collector;
  // The transferred RGB++ xUDT type script args
  xudtTypeArgs: Hex;
  // The rgbpp assets cell lock script args array whose data structure is: out_index | bitcoin_tx_id
  rgbppLockArgsList: Hex[];
  // The XUDT amount to be transferred, if the noMergeOutputCells is true, the transferAmount will be ignored
  transferAmount: bigint;
  // The sender BTC address
  fromBtcAddress: string;
  // The receiver BTC address
  toBtcAddress: string;
  btcDataSource: DataSource;
  isMainnet: boolean;
}

export interface RgbppTransferTxResult {
  ckbVirtualTxResult: BtcTransferVirtualTxResult;
  btcTxHexToSign: Hex;
}
