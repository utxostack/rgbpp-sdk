import { describe, it } from 'vitest';
import { bitcoin } from '@rgbpp-sdk/btc';
import { createP2wpkhAccount, signPsbt } from './shared/account';
import { buildRgbppTransferAllTxs, sendRgbppTxGroups } from '../src';
import { btcNetworkType, btcSource, ckbCollector, isMainnet } from './shared/env';

const SEND_TX_GROUPS = false;

describe('RgbppXudt', () => {
  describe('buildRgbppTransferAllTxs()', () => {
    it('50 included cells, 41 excluded cells', async () => {
      // Account with 41 cells, all bound to the same UTXO
      const alice = createP2wpkhAccount(
        '35fa7b38ae8d3820c1b6d38a5b3512b88153598560b0319c115ef1b709045deb',
        btcNetworkType,
      );
      // Account with 50 cells, each bound to an individual UTXO
      const bob = createP2wpkhAccount(
        '00b741c00dffacd2ea04c561707ce8e5103b64fd6e393d3e3bbe7059626e434c',
        btcNetworkType,
      );
      // The recipient account, also the sponsor to pay for the transfer transactions on BTC
      const charlie = createP2wpkhAccount(
        '6054a5a5bc914bef6576b26ed6a9b6edb61be659a217931fe378b58c0b4bca7a',
        btcNetworkType,
      );
      // The type script args of the target XUDT, transferring all this type of asset from alice and bob
      const xudtTypeArgs = '0xc93f5366966d56351d8cf4a7585e7e79d84c54a9ea4fa8512b14cc8fd0b49747';

      // Transfer all assets from Alice to Bob
      const result = await buildRgbppTransferAllTxs({
        ckb: {
          xudtTypeArgs,
          collector: ckbCollector,
        },
        btc: {
          assetAddresses: [alice.address, bob.address],
          fromAddress: charlie.address,
          toAddress: charlie.address,
          dataSource: btcSource,
        },
        isMainnet,
      });

      console.log('result.transactions.length', result.transactions.length);
      console.log('result.summary.included.assets', result.summary.included.assets);
      console.log('result.summary.excluded.assets', result.summary.excluded.assets);
      console.log(
        'result',
        JSON.stringify(result, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2),
      );

      // TODO: write expects

      /*expect(result.transactions).toHaveLength(2);

      expect(result.summary.included.assets).toHaveLength(1);
      expect(result.summary.included.assets[0]).toBeDefined();
      expect(result.summary.included.assets[0].cells).toEqual(50);
      expect(result.summary.included.assets[0].utxos).toEqual(50);

      expect(result.summary.excluded.assets).toHaveLength(1);
      expect(result.summary.excluded.assets[0]).toBeDefined();
      expect(result.summary.excluded.assets[0].cells).toEqual(41);
      expect(result.summary.excluded.assets[0].utxos).toEqual(1);*/

      if (!SEND_TX_GROUPS) {
        return;
      }

      // Sign transactions
      const signedGroups = result.transactions.map((group) => {
        const psbt = bitcoin.Psbt.fromHex(group.btc.psbtHex);
        signPsbt(psbt, alice);
        signPsbt(psbt, bob);

        psbt.finalizeAllInputs();
        const tx = psbt.extractTransaction();

        return {
          ckbVirtualTxResult: group.ckb.toString(),
          btcTxHex: tx.toHex(),
        };
      });

      // Send transactions
      const sentGroups = await sendRgbppTxGroups({
        txGroups: signedGroups,
        btcService: btcSource.service,
      });
      console.log('sent', sentGroups);
    }, 0);
  });
});
