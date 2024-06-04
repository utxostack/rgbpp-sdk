import z from 'zod';

export const envSchema = z.object({
  NETWORK: z.enum(['mainnet', 'testnet']).default('testnet'),
  CKB_RPC_URL: z.string().default('https://testnet.ckb.dev'),
});
