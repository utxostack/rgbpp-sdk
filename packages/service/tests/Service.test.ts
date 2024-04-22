import { Cell, blockchain } from '@ckb-lumos/base';
import { bytes } from '@ckb-lumos/codec';
import { describe, expect, it } from 'vitest';
import { BtcAssetsApiError, BtcAssetsApi, ErrorCodes, ErrorMessages } from '../src';

describe(
  'BtcServiceApi',
  {
    retry: 3,
  },
  () => {
    const btcAddress = 'tb1qm06rvrq8jyyckzc5v709u7qpthel9j4d9f7nh3';
    const service = BtcAssetsApi.fromToken(
      process.env.VITE_SERVICE_URL!,
      process.env.VITE_SERVICE_TOKEN!,
      process.env.VITE_SERVICE_ORIGIN!,
    );

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
        const blockchainInfo = await serviceWithApp.getBtcBlockchainInfo();
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

    describe('Bitcoin', () => {
      it('Get blockchain info', async () => {
        const res = await service.getBtcBlockchainInfo();
        expect(res.chain).toBeTypeOf('string');
        expect(res.blocks).toBeTypeOf('number');
        expect(res.headers).toBeTypeOf('number');
        expect(res.mediantime).toBeTypeOf('number');
        expect(res.difficulty).toBeTypeOf('number');
        expect(res.bestblockhash).toBeTypeOf('string');
      });
      it('Get balance', async () => {
        const res = await service.getBtcBalance('tb1qm06rvrq8jyyckzc5v709u7qpthel9j4d9f7nh3');
        expect(res.address).toEqual('tb1qm06rvrq8jyyckzc5v709u7qpthel9j4d9f7nh3');
        expect(res.satoshi).toBeTypeOf('number');
        expect(res.pending_satoshi).toBeTypeOf('number');
        expect(res.dust_satoshi).toBeTypeOf('number');
        expect(res.utxo_count).toBeTypeOf('number');
      });
      it('Get balance with min_satoshi filter', async () => {
        const originalBalance = await service.getBtcBalance(btcAddress);
        const filteredBalance = await service.getBtcBalance(btcAddress, {
          min_satoshi: originalBalance.satoshi + 1,
        });

        expect(filteredBalance.satoshi).toEqual(0);
        expect(filteredBalance.dust_satoshi).toEqual(originalBalance.satoshi + originalBalance.dust_satoshi);
      });
      it('Get UTXO[]', async () => {
        const res = await service.getBtcUtxos(btcAddress);
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
      });
      it('Get UTXO[] with min_satoshi filter', async () => {
        const originalUtxos = await service.getBtcUtxos(btcAddress);

        const maxValue = originalUtxos.reduce((max, out) => Math.max(max, out.value), 0);
        const filteredUtxos = await service.getBtcUtxos(btcAddress, {
          min_satoshi: maxValue + 1,
        });

        expect(filteredUtxos.length).toBe(0);
      });
      it('Get UTXO[] with only_collected filter', async () => {
        const confirmedUtxos = await service.getBtcUtxos(btcAddress, {
          only_confirmed: true,
        });
        expect(Array.isArray(confirmedUtxos)).toBe(true);
        for (const utxo of confirmedUtxos) {
          expect(utxo.status.confirmed).toBe(true);
        }
      });
      it('Get transactions', async () => {
        const res = await service.getBtcTransactions(btcAddress);
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
      });
      it('Get transaction', async () => {
        const res = await service.getBtcTransaction('102d5a002e72f0781944eef636117377da6d3601061e47e03025e7cd29a91579');
        expect(res.txid).toBe('102d5a002e72f0781944eef636117377da6d3601061e47e03025e7cd29a91579');
      });
    });

    describe('RGBPP', () => {
      const rgbppBtcAddress = 'tb1q3k837txmex9p294h6trmzquf9vyx36k740dpv4';
      const rgbppBtcTxId = 'a7c3f37227a2becbaeb5840be2bdaa33bb4bc88d0ffb5f90f814c92982b8c367';
      const rgbppBtcVout = 1;
      const rgbppCellType = bytes.hexify(
        blockchain.Script.pack({
          codeHash: '0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb',
          args: '0x1ba116c119d1cfd98a53e9d1a615cf2af2bb87d95515c9d217d367054cfc696b',
          hashType: 'type',
        }),
      );

      const emptyBtcTxId = '0000000000000000000000000000000000000000000000000000000000000001';

      it('Get paymaster info', async () => {
        try {
          const res = await service.getRgbppPaymasterInfo();
          expect(res).toBeDefined();
          expect(res.btc_address).toBeTypeOf('string');
          expect(res.fee).toBeTypeOf('number');
        } catch (e) {
          expect(e).toBeInstanceOf(BtcAssetsApiError);
          expect(e.code).toBe(ErrorCodes.ASSETS_API_RESOURCE_NOT_FOUND);
        }
      });
      it('Get the hash of RGBPP CKB_TX', async () => {
        const res = await service.getRgbppTransactionHash(rgbppBtcTxId);
        expect(res).toBeDefined();
        expect(res.txhash).toBeTypeOf('string');
        expect(res.txhash).toHaveLength(66);
      });
      it('Try to get the hash of non-existent RGBPP CKB_TX', async () => {
        await expect(() => service.getRgbppTransactionHash(emptyBtcTxId)).rejects.toHaveProperty(
          'code',
          ErrorCodes.ASSETS_API_RESOURCE_NOT_FOUND,
        );
      });
      // TODO: make a record and remove the "skip" marker
      it.skip('Get the state of RGBPP CKB_TX', async () => {
        const res = await service.getRgbppTransactionState(rgbppBtcTxId);
        expect(res).toBeDefined();
        expect(res.state).toBeTypeOf('string');
        expect(res.state).toSatisfy(
          (state: string) => ['completed', 'failed', 'delayed', 'active', 'waiting'].includes(state),
          `state "${res.state}" should be one of the RgbppTransactionState enum`,
        );
      });
      it('Try to get the state of non-existent RGBPP CKB_TX', async () => {
        await expect(() => service.getRgbppTransactionState(emptyBtcTxId)).rejects.toHaveProperty(
          'code',
          ErrorCodes.ASSETS_API_RESOURCE_NOT_FOUND,
        );
      });
      it('Get RGBPP cells by BTC_TX_ID', async () => {
        const res = await service.getRgbppAssetsByBtcTxId(rgbppBtcTxId);
        expect(res).toBeDefined();
        expect(res.length).toBeGreaterThan(0);
        for (const cell of res) {
          expectCell(cell);
        }
      });
      it('Get RGBPP cells by BTC_UTXO', async () => {
        const res = await service.getRgbppAssetsByBtcUtxo(rgbppBtcTxId, rgbppBtcVout);
        expect(res).toBeDefined();
        expect(res.length).toBeGreaterThan(0);
        for (const cell of res) {
          expectCell(cell);
        }
      });
      it('Get RGBPP cells by BTC_ADDRESS', async () => {
        const res = await service.getRgbppAssetsByBtcAddress(rgbppBtcAddress, {
          type_script: rgbppCellType,
        });
        expect(res).toBeDefined();
        expect(res.length).toBeGreaterThan(0);
        for (const cell of res) {
          expectCell(cell);
        }
      });
      it('Get RGBPP SPV proof', async () => {
        const res = await service.getRgbppSpvProof(rgbppBtcTxId, 6);
        expect(res).toBeDefined();
        expect(res.proof).toBeTypeOf('string');
        expect(res.spv_client).toBeDefined();
        expect(res.spv_client.index).toBeTypeOf('string');
        expect(res.spv_client.tx_hash).toBeTypeOf('string');
      });
      it('Try to get non-existent RGBPP SPV proof', async () => {
        await expect(() => service.getRgbppSpvProof(emptyBtcTxId, 0)).rejects.toHaveProperty(
          'code',
          ErrorCodes.ASSETS_API_RESOURCE_NOT_FOUND,
        );
      });
    });
  },
);

function expectCell(cell: Cell) {
  expect(cell).toBeDefined();
  expect(cell.cellOutput).toBeDefined();

  expect(cell.cellOutput.capacity).toBeTypeOf('string');

  expect(cell.cellOutput.lock).toBeDefined();
  expect(cell.cellOutput.lock.codeHash).toBeTypeOf('string');
  expect(cell.cellOutput.lock.hashType).toBeTypeOf('string');
  expect(cell.cellOutput.lock.args).toBeTypeOf('string');

  expect(cell.cellOutput.type).toBeDefined();
  expect(cell.cellOutput.type?.codeHash).toBeTypeOf('string');
  expect(cell.cellOutput.type?.hashType).toBeTypeOf('string');
  expect(cell.cellOutput.type?.args).toBeTypeOf('string');

  expect(cell.outPoint).toBeDefined();
  expect(cell.outPoint?.txHash).toBeTypeOf('string');
  expect(cell.outPoint?.index).toBeTypeOf('string');

  expect(cell.data).toBeTypeOf('string');
}
