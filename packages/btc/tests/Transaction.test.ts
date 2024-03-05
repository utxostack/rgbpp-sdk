import { describe, expect, it } from 'vitest';
import { accounts, networkType, service } from './shared/env';
import { DataSource, sendBtc } from '../src';

describe.skip('Transaction', () => {
  const addresses = [
    { type: 'Native SegWit (P2WPKH)', address: accounts.charlie.p2wpkh.address },
    { type: 'Nested SegWit (P2SH)', address: '2N4gkVAQ1f6bi8BKon8MLKEV1pi85MJWcPV' },
    { type: 'Taproot (P2TR)', address: 'tb1pjew2gs9aqr2m7r8jc8car9jpwuv6wye006l4slplzcthupnldmjqpf8h5d' },
    { type: 'Legacy (P2PKH)', address: 'mqkAgjy8gfrMZh1VqV5Wm1Yi4G9KWLXA1Q' },
  ];

  addresses.forEach((addressInfo, index) => {
    it(`Transfer BTC from P2WPKH address to ${addressInfo.type} address`, async () => {
      if (index !== 0) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
      const source = new DataSource(service, networkType);
      const psbt = await sendBtc({
        from: accounts.charlie.p2wpkh.address,
        tos: [
          {
            address: addressInfo.address,
            value: 1000,
          },
        ],
        networkType,
        source,
      });

      // Sign & finalize inputs
      psbt.signAllInputs(accounts.charlie.keyPair);
      psbt.finalizeAllInputs();

      // Broadcast transaction
      const tx = psbt.extractTransaction();
      console.log('ins:', tx.ins);
      console.log('outs:', tx.outs);
      const res = await service.sendTransaction(tx.toHex());
      expect(res.txid).toMatch(/^[a-f0-9]+$/);
      console.log(`explorer: https://mempool.space/testnet/tx/${res.txid}`);
    }, 10000);
  });
});
