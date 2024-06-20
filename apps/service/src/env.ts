import z from 'zod';

export const envSchema = z.object({
  NETWORK: z.enum(['mainnet', 'testnet']).default('testnet'),
  CKB_RPC_URL: z.string().default('https://testnet.ckb.dev'),

  BTC_SERVICE_URL: z.string(),
  BTC_SERVICE_TOKEN: z.string(),
  BTC_SERVICE_ORIGIN: z.string(),
  BTC_TESTNET_TYPE: z.string().default('Testnet3'),
});
