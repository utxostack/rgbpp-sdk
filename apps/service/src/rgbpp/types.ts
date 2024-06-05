import { Hex } from 'rgbpp/ckb';

export interface RgbppTransferReq {
  // The transferred RGB++ xUDT type script args
  xudtTypeArgs: string;
  // The rgbpp assets cell lock script args array whose data structure is: out_index | btc_tx_id
  rgbppLockArgsList: string[];
  // The xUDT amount to be transferred
  transferAmount: Hex;
  // The sender BTC address
  fromBtcAddress: string;
  // The receiver BTC address
  toBtcAddress: string;
}

export interface RgbppCkbBtcTransaction {
  // The JSON string for the `BtcTransferVirtualTxResult`
  ckbVirtualTxResult: string;
  // The BTC PSBT hex string which can be used to construct Bitcoin PSBT
  btcPsbtHex: Hex;
}

export interface RgbppCkbTxBtcTxId {
  // The JSON string for the `BtcTransferVirtualTxResult`
  ckbVirtualTxResult: string;
  // The BTC transaction id of the RGB++ operations
  btcTxId: Hex;
}

export interface RgbppStateReq {
  btcTxId: Hex;
  withData?: boolean;
}
