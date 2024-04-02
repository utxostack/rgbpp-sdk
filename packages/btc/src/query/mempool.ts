import Mempool from '@mempool/mempool.js';
import { NetworkType } from '../preset/types';
import { FeesRecommended } from '@mempool/mempool.js/lib/interfaces/bitcoin/fees';

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
export function networkTypeToMempoolConfig(network: NetworkType) {
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
  const config = networkTypeToMempoolConfig(network);
  return Mempool(config);
}

export enum RecommendedFeeRate {
  FASTEST = 'fastestFee',
  AVERAGE = 'halfHourFee',
  SLOW = 'hourFee',
  MINIMUM = 'minimumFee',
}

/**
 * Check if target string is a recommended fee type.
 * Acceptable fee types: "fastestFee", "halfHourFee", "hourFee", "minimumFee"
 */
export function isMempoolRecommendedFeeType(feeType: unknown): feeType is keyof FeesRecommended {
  const values: string[] = Object.values(RecommendedFeeRate);
  return typeof feeType === 'string' && values.includes(feeType);
}
