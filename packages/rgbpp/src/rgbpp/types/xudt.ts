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
  // If the asset is compatible xUDT(not standard xUDT), the compatibleXudtTypeScript is required
  compatibleXudtTypeScript?: CKBComponents.Script;
}

export interface RgbppTransferBtcParams {
  // The sender BTC address
  fromAddress: string;
  // The receiver BTC address
  toAddress: string;
  // The data source for collecting Bitcoin-related info
  dataSource: DataSource;
  // The public key of sender BTC address, must fill if the fromAddress is a P2TR address
  fromPubkey?: Hex;
  // The fee rate of the BTC transaction
  feeRate?: number;
  // The Bitcoin Testnet type including Testnet3 and Signet, default value is Testnet3
  testnetType?: BTCTestnetType;
}

export interface RgbppTransferTxParams {
  ckb: RgbppTransferCkbParams;
  btc: RgbppTransferBtcParams;
  // True is for BTC and CKB Mainnet, false is for BTC Testnet3/Signet and CKB Testnet
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
    // If the asset is compatible xUDT(not standard xUDT), the compatibleXudtTypeScript is required
    compatibleXudtTypeScript?: CKBComponents.Script;
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
    // The data source for collecting Bitcoin-related info
    dataSource: DataSource;
    // The public key of sender BTC address, must fill if the fromAddress is a P2TR address
    fromPubkey?: string;
    // The map helps find the corresponding public key of a BTC address,
    // note that you must specify a pubkey for each P2TR address in assetAddresses/fromAddress
    pubkeyMap?: AddressToPubkeyMap;
    // The BTC address to return change satoshi, default value is fromAddress
    changeAddress?: string;
    // The fee rate of the BTC transactions, will use the fastest fee rate if not specified
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
