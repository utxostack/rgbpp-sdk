import { bitcoin } from '../bitcoin.js';

export enum NetworkType {
  MAINNET,
  TESTNET,
  REGTEST, // deprecated
}

export interface RgbppBtcConfig {
  /**
   * The minimum fee rate that can be declared in a BTC transaction, in satoshi per byte.
   * Note this value can be different in different networks.
   */
  feeRate: number;
  /**
   * The minimum satoshi amount that can be declared in a BTC_UTXO.
   * BTC_UTXOs with satoshi below this constant are considered dust and will not be collected/created.
   * Officially, this constant should be 1,0000, but currently we are using 1,000 for testing purposes.
   */
  btcUtxoDustLimit: number;
  /**
   * The minimum satoshi amount that can be declared in a RGBPP_UTXO.
   * RGBPP_UTXOs with satoshi below this constant are considered dust and will not be created.
   */
  rgbppUtxoDustLimit: number;
  /**
   * The bitcoin-js lib predefined network object.
   * It contains crucial data to define what network we're working on.
   */
  network: bitcoin.Network;
  /**
   * The network type on RgbppBtc.
   * Note the "REGTEST" network is a deprecated network type, so you shouldn't use it.
   */
  networkType: NetworkType;
}
