import Mempool from '@mempool/mempool.js';
import { NetworkType } from '../network';

export type MempoolInstance = ReturnType<typeof Mempool>;

export interface MempoolConfig {
  hostname: string;
  network: string;
}

export const mempoolConfigs: Record<'mainnet' | 'testnet', MempoolConfig> = {
  testnet: {
    hostname: 'mempool.space',
    network: 'testnet',
  },
  mainnet: {
    hostname: 'mempool.space',
    network: 'mainnet',
  },
};

/**
 * Get predefined mempool config by network type.
 * If the network is regtest, it will use the testnet config.
 */
export function getMempoolConfig(network: NetworkType) {
  if (network === NetworkType.MAINNET) {
    return mempoolConfigs.mainnet;
  }

  // Using the testnet config for both testnet/regtest
  return mempoolConfigs.testnet;
}

/**
 * Create a mempool instance by network type.
 */
export function createMempool(network: NetworkType) {
  const config = getMempoolConfig(network);
  return Mempool(config);
}
