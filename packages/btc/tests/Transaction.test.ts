import { describe, expect, it } from 'vitest';
import { accounts, network, networkType, service, source } from './shared/env';
import { bitcoin, ErrorCodes, ErrorMessages, MIN_COLLECTABLE_SATOSHI, sendBtc, toXOnly, tweakSigner } from '../src';

describe('Transaction', () => {
  describe('Transfer from Native SegWit (P2WPKH) address', () => {
    const addresses = [
      { type: 'Taproot (P2TR)', address: accounts.charlie.p2tr.address },
      { type: 'Native SegWit (P2WPKH)', address: accounts.charlie.p2wpkh.address },
      { type: 'Nested SegWit (P2SH)', address: '2N4gkVAQ1f6bi8BKon8MLKEV1pi85MJWcPV' },
      { type: 'Legacy (P2PKH)', address: 'mqkAgjy8gfrMZh1VqV5Wm1Yi4G9KWLXA1Q' },
    ];
    addresses.forEach((addressInfo, index) => {
      it(`Transfer to ${addressInfo.type} address`, async () => {
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

        // Broadcast transaction
        // const tx = psbt.extractTransaction();
        // const res = await service.sendTransaction(tx.toHex());
        // console.log(`explorer: https://mempool.space/testnet/tx/${res.txid}`);
      }, 10000);
    });
  });
  it('Transfer from Taproot P2TR address', async () => {
    const psbt = await sendBtc({
      from: accounts.charlie.p2tr.address,
      fromPubkey: accounts.charlie.publicKey,
      tos: [
        {
          address: accounts.charlie.p2tr.address,
          value: 1000,
        },
      ],
      networkType,
      source,
    });

    // Create a tweaked signer
    const tweakedSigner = tweakSigner(accounts.charlie.keyPair, {
      network,
    });

    // Sign & finalize inputs
    psbt.signAllInputs(tweakedSigner);
    psbt.finalizeAllInputs();

    // Broadcast transaction
    // const tx = psbt.extractTransaction();
    // const res = await service.sendTransaction(tx.toHex());
    // console.log(`explorer: https://mempool.space/testnet/tx/${res.txid}`);
  });
  it('Transfer with an impossible "minUtxoSatoshi" filter', async () => {
    const balance = await service.getBalance(accounts.charlie.p2wpkh.address, {
      min_satoshi: MIN_COLLECTABLE_SATOSHI,
    });

    await expect(() =>
      sendBtc({
        from: accounts.charlie.p2wpkh.address,
        tos: [
          {
            address: accounts.charlie.p2wpkh.address,
            value: 1000,
          },
        ],
        minUtxoSatoshi: balance.satoshi + 1,
        networkType,
        source,
      }),
    ).rejects.toThrow(ErrorMessages[ErrorCodes.INSUFFICIENT_UTXO]);
  });
  it('Transfer with an extra OP_RETURN output', async () => {
    const psbt = await sendBtc({
      from: accounts.charlie.p2wpkh.address,
      tos: [
        {
          data: Buffer.from('00'.repeat(32), 'hex'),
          value: 0,
        },
        {
          address: accounts.charlie.p2wpkh.address,
          value: 1000,
        },
      ],
      networkType,
      source,
    });

    const outputs = psbt.txOutputs;
    expect(outputs).toHaveLength(3);

    const opReturnOutput = outputs[0];
    expect(opReturnOutput).toBeDefined();
    expect(opReturnOutput.script).toBeDefined();

    const scripts = bitcoin.script.decompile(opReturnOutput.script);
    expect(scripts).toBeDefined();

    const op = scripts![0];
    expect(op).toBeTypeOf('number');
    expect(op).toBe(bitcoin.opcodes.OP_RETURN);

    const data = scripts![1];
    expect(data).toBeInstanceOf(Buffer);
    expect((data as Buffer).toString('hex')).toEqual('00'.repeat(32));

    // Sign & finalize inputs
    psbt.signAllInputs(accounts.charlie.keyPair);
    psbt.finalizeAllInputs();

    // Broadcast transaction
    // const tx = psbt.extractTransaction();
    // const res = await service.sendTransaction(tx.toHex());
    // console.log(`explorer: https://mempool.space/testnet/tx/${res.txid}`);
  });
});
