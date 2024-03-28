import { bitcoin } from '../bitcoin';
import { NetworkType } from './types';
import { networkToConfig, networkTypeToConfig } from './config';

/**
 * Convert network type to bitcoinjs-lib network.
 */
export function networkTypeToNetwork(networkType: NetworkType): bitcoin.Network {
  const config = networkTypeToConfig(networkType);
  return config.network;
}

/**
 * Convert bitcoinjs-lib network to network type.
 */
export function networkToNetworkType(network: bitcoin.Network): NetworkType {
  const config = networkToConfig(network);
  return config.networkType;
}

/**
 * The rgbpp-sdk/ckb accepts a "isMainnet" property to indicate the network type.
 */
export function networkTypeToIsCkbMainnet(networkType: NetworkType): boolean {
  const config = networkTypeToConfig(networkType);
  return config.networkType === NetworkType.MAINNET;
}
