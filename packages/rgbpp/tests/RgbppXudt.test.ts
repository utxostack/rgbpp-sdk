import { describe, expect, it, vi, afterEach } from 'vitest';
import { bitcoin, encodeUtxoId } from '@rgbpp-sdk/btc';
import { bytes } from '@ckb-lumos/codec';
import { blockchain } from '@ckb-lumos/base';
import { RgbppTxGroup } from '../src/rgbpp/utils/transaction';
import { buildRgbppTransferAllTxs, sendRgbppTxGroups } from '../src';
import { createP2trAccount, signPsbt } from './shared/account';
import { btcNetworkType, btcSource, ckbCollector, isMainnet } from './shared/env';

import MOCKED_50_INCLUDED_AND_41_EXCLUDED from './mocked/50-included-41-excluded';

describe('RgbppXudt', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  describe('buildRgbppTransferAllTxs()', () => {
    const mocked = MOCKED_50_INCLUDED_AND_41_EXCLUDED;

    it('50 included cells, 41 excluded cells', async () => {
      // The sender account, with:
      // - 41 cells, all bound to the same UTXO
      // - 50 cells, each bound to an individual UTXO
      const alice = mocked.sender;
      // The recipient account, also the sponsor to pay for the transfer transactions on BTC
      const bob = mocked.receiver;
      // The target XUDT, transferring all this type of asset from alice to bob
      const xudtTypeArgs = mocked.xudtTypeArgs;

      // Mock service responses
      vi.spyOn(btcSource, 'getUtxo').mockImplementation((txid: string, vout: number) => {
        const utxoId = encodeUtxoId(txid, vout);
        if (alice.utxosByUtxoId[utxoId]) {
          return Promise.resolve(alice.utxosByUtxoId[utxoId]);
        }
        return Promise.resolve(undefined);
      });
      vi.spyOn(btcSource.service, 'getBtcUtxos').mockImplementation((address: string) => {
        if (address === alice.account.address) {
          return Promise.resolve(alice.btcUtxos);
        }
        if (address === bob.account.address) {
          return Promise.resolve(bob.btcUtxos);
        }
        return Promise.resolve([]);
      });
      vi.spyOn(btcSource.service, 'getRgbppAssetsByBtcAddress').mockImplementation((address: string) => {
        if (address === alice.account.address) {
          return Promise.resolve(alice.rgbppCells);
        }
        return Promise.resolve([]);
      });
      vi.spyOn(btcSource.service, 'getRgbppAssetsByBtcUtxo').mockImplementation((txid, vout) => {
        const utxoId = encodeUtxoId(txid, vout);
        if (alice.rgbppCellsByUtxoId[utxoId]) {
          return Promise.resolve(alice.rgbppCellsByUtxoId[utxoId]);
        }
        return Promise.resolve([]);
      });
      vi.spyOn(ckbCollector, 'getCells').mockImplementation(({ lock }) => {
        const lockHash = bytes.hexify(blockchain.Script.pack(lock));
        if (alice.rgbppCellsByLockHash[lockHash]) {
          return Promise.resolve(alice.rgbppCellsByLockHash[lockHash]);
        }
        return Promise.resolve([]);
      });
      vi.spyOn(ckbCollector, 'getLiveCells').mockImplementation((outPoints) => {
        const outPointsString = btoa(JSON.stringify(outPoints));
        for (const record of alice.liveCellsByOutPoints) {
          const aliceOutPointsString = btoa(JSON.stringify(record.outPoints));
          if (outPointsString === aliceOutPointsString) {
            return Promise.resolve(record.liveCells);
          }
        }
        return Promise.resolve([]);
      });
      vi.spyOn(ckbCollector, 'getLiveCell').mockImplementation((outPoint) => {
        const outPointsString = JSON.stringify(outPoint);
        return Promise.resolve(alice.liveCellByOutPoint[outPointsString]);
      });

      // Transfer all assets from alice to bob
      const result = await buildRgbppTransferAllTxs({
        ckb: {
          xudtTypeArgs,
          collector: ckbCollector,
        },
        btc: {
          assetAddresses: [alice.account.address],
          fromAddress: bob.account.address,
          toAddress: bob.account.address,
          dataSource: btcSource,
          feeRate: 1,
          pubkeyMap: {
            [alice.account.address]: alice.account.pubkey,
          },
        },
        isMainnet,
      });

      console.log('result.transactions.length', result.transactions.length);
      console.log('result.summary.included.assets', result.summary.included.assets);
      console.log('result.summary.excluded.assets', result.summary.excluded.assets);

      expect(result.summary.included.assets).toHaveProperty(xudtTypeArgs);
      expect(result.summary.included.assets[xudtTypeArgs].cells).toEqual(50);
      expect(result.summary.included.assets[xudtTypeArgs].utxos).toEqual(50);

      expect(result.summary.excluded.assets).toHaveProperty(xudtTypeArgs);
      expect(result.summary.excluded.assets[xudtTypeArgs].cells).toEqual(41);
      expect(result.summary.excluded.assets[xudtTypeArgs].utxos).toEqual(1);

      expect(result.transactions).toHaveLength(2);
      expect(result).toMatchSnapshot();
    }, 0);
    it('Sign P2WPKH/P2TR inputs and send transactions', async () => {
      const SEND_TX_GROUPS = false;

      // The sender account, with:
      // - 41 cells, all bound to the same UTXO
      // - 50 cells, each bound to an individual UTXO
      const alice = mocked.sender;
      const aliceAccount = createP2trAccount(alice.account.privateKey, btcNetworkType);

      // Sign transactions
      const signedGroups: RgbppTxGroup[] = mocked.buildResult.transactions.map((group) => {
        const psbt = bitcoin.Psbt.fromHex(group.btc.psbtHex);
        signPsbt(psbt, aliceAccount);
        psbt.finalizeAllInputs();

        return {
          ckbVirtualTxResult: JSON.stringify(group.ckb.virtualTxResult),
          btcTxHex: psbt.extractTransaction().toHex(),
        };
      });

      console.log('signedGroups', JSON.stringify(signedGroups, null, 2));

      if (!SEND_TX_GROUPS) {
        return;
      }

      // Send transactions
      const sentGroups = await sendRgbppTxGroups({
        txGroups: signedGroups,
        btcService: btcSource.service,
      });

      console.log('sentGroups', JSON.stringify(sentGroups, null, 2));
    }, 0);
  });
});
