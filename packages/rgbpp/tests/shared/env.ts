import { DataSource, NetworkType, networkTypeToConfig } from '@rgbpp-sdk/btc';
import { BtcAssetsApi } from '@rgbpp-sdk/service';
import { Collector } from '@rgbpp-sdk/ckb';
import { z } from 'zod';

const EnvSchema = z
  .object({
    VITE_IS_MAINNET: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
    VITE_CKB_NODE_URL: z.string().url(),
    VITE_CKB_INDEXER_URL: z.string().url(),
    VITE_BTC_SERVICE_URL: z.string().url(),
    VITE_BTC_SERVICE_TOKEN: z.string(),
    VITE_BTC_SERVICE_ORIGIN: z.string(),
  })
  .transform((env) => {
    return {
      IS_MAINNET: env.VITE_IS_MAINNET,
      CKB_NODE_URL: env.VITE_CKB_NODE_URL,
      CKB_INDEXER_URL: env.VITE_CKB_INDEXER_URL,
      BTC_SERVICE_URL: env.VITE_BTC_SERVICE_URL,
      BTC_SERVICE_TOKEN: env.VITE_BTC_SERVICE_TOKEN,
      BTC_SERVICE_ORIGIN: env.VITE_BTC_SERVICE_ORIGIN,
    };
  });

/**
 * Common
 */
export const env = EnvSchema.parse(process.env);
export const isMainnet = env.IS_MAINNET;

/**
 * BTC
 */
export const btcNetworkType = isMainnet ? NetworkType.MAINNET : NetworkType.TESTNET;
export const btcService = BtcAssetsApi.fromToken(env.BTC_SERVICE_URL, env.BTC_SERVICE_TOKEN, env.BTC_SERVICE_ORIGIN);
export const btcSource = new DataSource(btcService, btcNetworkType);
export const btcConfig = networkTypeToConfig(btcNetworkType);

/**
 * CKB
 */
export const ckbCollector = new Collector({
  ckbNodeUrl: env.CKB_NODE_URL,
  ckbIndexerUrl: env.CKB_INDEXER_URL,
});
