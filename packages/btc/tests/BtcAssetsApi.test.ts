import { describe, expect, it } from 'vitest';
import { accounts, service } from './shared/env';
import { BtcAssetsApi, ErrorCodes, ErrorMessages } from '../src';

describe(
  'BtcServiceApi',
  {
    retry: 3,
  },
  () => {
    describe('Initiation and token generation', () => {
      it('Initiate with invalid "domain" param', async () => {
        expect(
          () =>
            new BtcAssetsApi({
              url: process.env.VITE_SERVICE_URL!,
              domain: 'https://btc-test.app',
            }),
        ).toThrow(`${ErrorMessages[ErrorCodes.ASSETS_API_INVALID_PARAM]}: domain`);
      });
      it('Generate a valid token', async () => {
        const serviceWithApp = new BtcAssetsApi({
          url: process.env.VITE_SERVICE_URL!,
          app: 'btc-test-app',
          domain: 'btc-test.app',
          origin: 'https://btc-test.app',
        });

        // Generate a new token
        await serviceWithApp.init();

        // Request with the generated token
        const blockchainInfo = await serviceWithApp.getBlockchainInfo();
        expect(blockchainInfo.chain).toBeTypeOf('string');
      });
      it('Generate token without the "app" param', async () => {
        const serviceWithoutApp = new BtcAssetsApi({
          url: process.env.VITE_SERVICE_URL!,
          domain: 'btc-test.app',
        });

        await expect(async () => serviceWithoutApp.generateToken()).rejects.toThrow(
          `${ErrorMessages[ErrorCodes.ASSETS_API_INVALID_PARAM]}: app, domain`,
        );
      });
    });

    describe('Queries', () => {
      it('Get BlockchainInfo', async () => {
        const res = await service.getBlockchainInfo();
        expect(res.chain).toBeTypeOf('string');
        expect(res.blocks).toBeTypeOf('number');
        expect(res.headers).toBeTypeOf('number');
        expect(res.mediantime).toBeTypeOf('number');
        expect(res.difficulty).toBeTypeOf('number');
        expect(res.bestblockhash).toBeTypeOf('string');
      });
      it('Get balance', async () => {
        const res = await service.getBalance(accounts.charlie.p2wpkh.address);
        expect(res.address).toEqual('tb1qm06rvrq8jyyckzc5v709u7qpthel9j4d9f7nh3');
        expect(res.satoshi).toBeTypeOf('number');
        expect(res.pending_satoshi).toBeTypeOf('number');
        expect(res.dust_satoshi).toBeTypeOf('number');
        expect(res.utxo_count).toBeTypeOf('number');
      }, 0);
      it('Get balance with min_satoshi filter', async () => {
        const originalBalance = await service.getBalance(accounts.charlie.p2wpkh.address);
        const filteredBalance = await service.getBalance(accounts.charlie.p2wpkh.address, {
          min_satoshi: originalBalance.satoshi + 1,
        });

        expect(filteredBalance.satoshi).toEqual(0);
        expect(filteredBalance.dust_satoshi).toEqual(originalBalance.satoshi + originalBalance.dust_satoshi);
      }, 0);
      it('Get UTXOs', async () => {
        const res = await service.getUtxos(accounts.charlie.p2wpkh.address);
        expect(Array.isArray(res)).toBe(true);
        expect(res.length).toBeGreaterThan(0);

        res.forEach((utxo) => {
          expect(utxo.txid).toBeTypeOf('string');
          expect(utxo.vout).toBeTypeOf('number');
          expect(utxo.value).toBeTypeOf('number');
          expect(utxo.value).toBeGreaterThan(0);
          expect(utxo.status).toBeTypeOf('object');
          expect(utxo.status.confirmed).toBeDefined();
          expect(utxo.status.confirmed).toBeTypeOf('boolean');
          if (utxo.status.confirmed) {
            expect(utxo.status.block_height).toBeTypeOf('number');
            expect(utxo.status.block_hash).toBeTypeOf('string');
            expect(utxo.status.block_time).toBeTypeOf('number');
          }
        });
      }, 0);
      it('Get UTXOs with min_satoshi filter', async () => {
        const originalUtxos = await service.getUtxos(accounts.charlie.p2wpkh.address);

        const maxValue = originalUtxos.reduce((max, out) => Math.max(max, out.value), 0);
        const filteredUtxos = await service.getUtxos(accounts.charlie.p2wpkh.address, {
          min_satoshi: maxValue + 1,
        });

        expect(filteredUtxos.length).toBe(0);
      });
      it('Get Transactions', async () => {
        const res = await service.getTransactions(accounts.charlie.p2wpkh.address);
        expect(Array.isArray(res)).toBe(true);
        expect(res.length).toBeGreaterThan(0);
        res.forEach((transaction) => {
          expect(transaction.txid).toBeTypeOf('string');
          expect(transaction.version).toBeTypeOf('number');
          if (transaction.status.confirmed) {
            expect(transaction.status.block_height).toBeTypeOf('number');
            expect(transaction.status.block_hash).toBeTypeOf('string');
            expect(transaction.status.block_time).toBeTypeOf('number');
          }
        });
      }, 0);
      it('Get Transaction', async () => {
        const res = await service.getTransaction('102d5a002e72f0781944eef636117377da6d3601061e47e03025e7cd29a91579');
        expect(res.txid).toBe('102d5a002e72f0781944eef636117377da6d3601061e47e03025e7cd29a91579');
      });
    });
  },
);
