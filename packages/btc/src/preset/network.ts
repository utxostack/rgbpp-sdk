import { bitcoin } from '../bitcoin.js';
import { NetworkType } from './types.js';
import { networkToConfig, networkTypeToConfig } from './config.js';

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
