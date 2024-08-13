import { RgbppTransferAllTxGroup, RgbppTransferAllTxsResult } from 'rgbpp';
import { AddressToPubkeyMap } from 'rgbpp/btc';
import { Hex } from 'rgbpp/ckb';

export interface RgbppTransferReq {
  // The transferred RGB++ xUDT type script args
  xudtTypeArgs: Hex;
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
  params?: {
    withData?: boolean;
  };
}

export interface RgbppCkbTxHashReq {
  btcTxId: Hex;
}

export interface BtcTxSendReq {
  txHex: Hex;
}

export interface RgbppTransferAllReq {
  ckb: {
    // The transferred RGB++ xUDT type script args
    xudtTypeArgs: Hex;
    // The CKB transaction fee rate in hex format, default value is 0x44c (1100)
    feeRate?: Hex;
  };
  btc: {
    // The list of BTC addresses to provide RGB++ xUDT assets
    // All available amounts of the target asset (specified by ckb.xudtTypeArgs) will be included in the transfers
    // However, if more than 40 cells are bound to the same UTXO, the amounts within those 40 cells are excluded
    assetAddresses: string[];
    // The BTC address for paying all the transaction costs, but not provide any RGB++ assets
    fromAddress: string;
    // The BTC address for receiving all the RGB++ assets
    toAddress: string;
    // The public key of sender BTC address, must fill if the fromAddress is a P2TR address
    fromPubkey?: string;
    // The map helps find the corresponding public key of a BTC address,
    // note that you must specify a pubkey for each P2TR address in assetAddresses/fromAddress
    pubkeyMap?: AddressToPubkeyMap;
    // The BTC address to return change satoshi, default value is fromAddress
    changeAddress?: string;
    // The fee rate of the BTC transactions, will use the fastest fee rate if not specified
    feeRate?: number;
  };
}

export interface RgbppTransferAllRes extends Omit<RgbppTransferAllTxsResult, 'transactions'> {
  transactions: RgbppTransferAllGroupWithStringCkbVtx[];
}

export interface RgbppTransferAllGroupWithStringCkbVtx extends Omit<RgbppTransferAllTxGroup, 'ckb'> {
  ckb: Omit<RgbppTransferAllTxGroup['ckb'], 'virtualTxResult'> & {
    virtualTxResult: string;
  };
}
