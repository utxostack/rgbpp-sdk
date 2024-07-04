import cloneDeep from 'lodash/cloneDeep.js';
import { bitcoin } from '../bitcoin';
import { ErrorCodes, TxBuildError } from '../error';
import { NetworkType, RgbppBtcConfig } from './types';

const defaultConfigs: Record<'testnet' | 'mainnet', RgbppBtcConfig> = {
  testnet: {
    feeRate: 1,
    btcUtxoDustLimit: 1000,
    rgbppUtxoDustLimit: 546,
    network: bitcoin.networks.testnet,
    networkType: NetworkType.TESTNET,
  },
  mainnet: {
    feeRate: 20,
    btcUtxoDustLimit: 10000,
    rgbppUtxoDustLimit: 546,
    network: bitcoin.networks.bitcoin,
    networkType: NetworkType.MAINNET,
  },
};

/**
 * Get RgbppBtcConfig by a network type.
 * If the network type is "REGTEST", it throws an unsupported network error.
 */
export function networkTypeToConfig(networkType: NetworkType): RgbppBtcConfig {
  if (networkType === NetworkType.TESTNET) {
    return cloneDeep(defaultConfigs.testnet);
  }
  if (networkType === NetworkType.MAINNET) {
    return cloneDeep(defaultConfigs.mainnet);
  }

  throw new TxBuildError(ErrorCodes.UNSUPPORTED_NETWORK_TYPE);
}

/**
 * Get RgbppBtcConfig by a bitcoinjs-lib network object.
 * If the network is not recognized, it throws an unsupported network error.
 */
export function networkToConfig(network: bitcoin.Network): RgbppBtcConfig {
  if (network.bech32 == bitcoin.networks.bitcoin.bech32) {
    return cloneDeep(defaultConfigs.mainnet);
  }
  if (network.bech32 == bitcoin.networks.testnet.bech32) {
    return cloneDeep(defaultConfigs.testnet);
  }

  throw new TxBuildError(ErrorCodes.UNSUPPORTED_NETWORK_TYPE);
}
