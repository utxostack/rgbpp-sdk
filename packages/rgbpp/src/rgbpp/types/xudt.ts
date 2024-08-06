import { BaseCkbVirtualTxResult, BTCTestnetType, BtcTransferVirtualTxResult, Collector, Hex } from '@rgbpp-sdk/ckb';
import { AddressToPubkeyMap, DataSource } from '@rgbpp-sdk/btc';
import { TransactionGroupSummary } from '../summary/asset-summarizer';

export interface RgbppTransferCkbParams {
  // The collector that collects CKB live cells and transactions
  collector: Collector;
  // The transferred RGB++ xUDT type script args
  xudtTypeArgs: Hex;
  // The rgbpp assets cell lock script args array whose data structure is: out_index | bitcoin_tx_id
  rgbppLockArgsList: Hex[];
  // The XUDT amount to be transferred, if the noMergeOutputCells is true, the transferAmount will be ignored
  transferAmount: bigint;
  // The CKB transaction fee rate, default value is 1100
  feeRate?: bigint;
}

export interface RgbppTransferBtcParams {
  // The sender BTC address
  fromAddress: string;
  // The receiver BTC address
  toAddress: string;
  dataSource: DataSource;
  // The public key of sender BTC address
  fromPubkey?: Hex;
  // The fee rate of the BTC transaction
  feeRate?: number;
  // The Bitcoin Testnet type including Testnet3 and Signet, default value is Testnet3
  testnetType?: BTCTestnetType;
}

export interface RgbppTransferTxParams {
  ckb: RgbppTransferCkbParams;
  btc: RgbppTransferBtcParams;
  // True is for BTC and CKB Mainnet, false is for BTC and CKB Testnet
  isMainnet: boolean;
}

export interface RgbppTransferTxResult {
  ckbVirtualTxResult: BtcTransferVirtualTxResult;
  // The BTC PSBT hex string which can be used to construct Bitcoin PSBT
  btcPsbtHex: Hex;
}

export interface RgbppTransferAllTxsParams {
  ckb: {
    // The collector that collects CKB live cells and transactions
    collector: Collector;
    // The transferred RGB++ xUDT type script args
    xudtTypeArgs: Hex;
    // The CKB transaction fee rate, default value is 1100
    feeRate?: bigint;
  };
  btc: {
    // The BTC addresses to transfer all the RGB++ assets from
    assetAddresses: string[];
    // The BTC address for paying all the transaction fees
    fromAddress: string;
    // The BTC address for receiving all the RGB++ assets
    toAddress: string;
    // The data source for collecting Bitcoin-related info
    dataSource: DataSource;
    // The map helps find the corresponding public key of a BTC address,
    // note that you must specify a pubkey for each P2TR address in assetAddresses/fromAddress
    pubkeyMap?: AddressToPubkeyMap;
    // The BTC address to return change satoshi, default value is fromAddress
    changeAddress?: string;
    // The fee rate of the BTC transactions
    feeRate?: number;
    // The BTC Testnet to use, supports "Testnet3" and "Signet", default value is "Testnet3",
    // the param helps find the targeting version of rgbpp-lock script on CKB Testnet
    testnetType?: BTCTestnetType;
  };
  // True is for BTC and CKB Mainnet, false is for BTC Testnet3/Signet and CKB Testnet
  isMainnet: boolean;
}

export interface RgbppTransferAllTxsResult {
  transactions: RgbppTransferAllTxGroup[];
  summary: {
    included: TransactionGroupSummary;
    excluded: TransactionGroupSummary;
  };
}

export interface RgbppTransferAllTxGroup {
  ckb: {
    virtualTxResult: BaseCkbVirtualTxResult;
  };
  btc: {
    psbtHex: string;
    feeRate: number;
    fee: number;
  };
  summary: TransactionGroupSummary;
}
