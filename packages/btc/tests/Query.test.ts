import { describe, expect, it } from 'vitest';
import { accounts, assetsApi } from './shared/env';

describe('Query', () => {
  describe(
    'BtcServiceApi queries',
    {
      retry: 3,
    },
    () => {
      it('Get balance', async () => {
        const res = await assetsApi.getBalance(accounts.charlie.p2wpkh.address);
        expect(res.address).toEqual('tb1qm06rvrq8jyyckzc5v709u7qpthel9j4d9f7nh3');
        expect(typeof res.satoshi).toBe('number');
      }, 0);
      it('Get UTXOs', async () => {
        const res = await assetsApi.getUtxos(accounts.charlie.p2wpkh.address);
        expect(Array.isArray(res)).toBe(true);
        expect(res.length).toBeGreaterThan(0);

        res.forEach((utxo) => {
          expect(typeof utxo.txid).toBe('string');
          expect(typeof utxo.vout).toBe('number');
          expect(typeof utxo.value).toBe('number');
          expect(utxo.value).toBeGreaterThan(0);
          expect(typeof utxo.status).toBe('object');
          expect(utxo.status.confirmed).toBeDefined();
          expect(typeof utxo.status.confirmed).toBe('boolean');
          if (utxo.status.confirmed) {
            expect(typeof utxo.status.block_height).toBe('number');
            expect(typeof utxo.status.block_hash).toBe('string');
            expect(typeof utxo.status.block_time).toBe('number');
          }
        });
      }, 0);
      it('Get Transactions', async () => {
        const res = await assetsApi.getTransactions(accounts.charlie.p2wpkh.address);
        expect(Array.isArray(res)).toBe(true);
        expect(res.length).toBeGreaterThan(0);
        res.forEach((transaction) => {
          expect(typeof transaction.txid).toBe('string');
          expect(typeof transaction.version).toBe('number');
          if (transaction.status.confirmed) {
            expect(typeof transaction.status.block_height).toBe('number');
            expect(typeof transaction.status.block_hash).toBe('string');
            expect(typeof transaction.status.block_time).toBe('number');
          }
        });
      }, 0);
      it('Get Transaction', async () => {
        const res = await assetsApi.getTransaction('102d5a002e72f0781944eef636117377da6d3601061e47e03025e7cd29a91579');
        expect(res.txid).toBe('102d5a002e72f0781944eef636117377da6d3601061e47e03025e7cd29a91579');
      });
    },
  );
});
