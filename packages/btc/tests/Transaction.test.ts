import { describe, expect, it } from 'vitest';
import { accounts, networkType, source } from './shared/env';
import { ErrorCodes, ErrorMessages, sendBtc } from '../src';

describe('Transaction', () => {
  describe('Transfer to various address types', () => {
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

        // Convert psbt to transaction
        const tx = psbt.extractTransaction();
        console.log('ins:', tx.ins);
        console.log('outs:', tx.outs);

        // Broadcast transaction
        // const res = await service.sendTransaction(tx.toHex());
        // console.log(`explorer: https://mempool.space/testnet/tx/${res.txid}`);
      }, 10000);
    });
  });
  it('Transfer with an impossible "minUtxoSatoshi" filter', async () => {
    await expect(() =>
      sendBtc({
        from: accounts.charlie.p2wpkh.address,
        tos: [
          {
            address: accounts.charlie.p2wpkh.address,
            value: 1000,
          },
        ],
        minUtxoSatoshi: 1000000000000,
        networkType,
        source,
      }),
    ).rejects.toThrow(ErrorMessages[ErrorCodes.INSUFFICIENT_UTXO]);
  });
});
