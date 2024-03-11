import { describe, expect, it } from 'vitest';
import { bitcoin, ECPair, toXOnly } from '../src';
import { network } from './shared/env';

describe('Address', () => {
  it('Create SegWit (P2WPKH) address', () => {
    const keyPair = ECPair.fromPrivateKey(
      Buffer.from('8d3c23d340ac0841e6c3b58a9bbccb9a28e94ab444f972cff35736fa2fcf9f3f', 'hex'),
      { network },
    );

    expect(keyPair.publicKey.toString('hex')).toEqual(
      '037dff8ff2e0bd222690d785f9277e0c4800fc88b0fad522f1442f21a8226253ce',
    );

    const { address } = bitcoin.payments.p2wpkh({
      pubkey: keyPair.publicKey,
      network,
    });

    expect(address).toEqual('tb1qm06rvrq8jyyckzc5v709u7qpthel9j4d9f7nh3');
  });
  it('Create Taproot (P2TR) address', async () => {
    const keyPair = ECPair.fromPrivateKey(
      Buffer.from('8d3c23d340ac0841e6c3b58a9bbccb9a28e94ab444f972cff35736fa2fcf9f3f', 'hex'),
      { network },
    );

    const tapInternalPubkey = toXOnly(keyPair.publicKey);
    expect(tapInternalPubkey.toString('hex')).toEqual(
      '7dff8ff2e0bd222690d785f9277e0c4800fc88b0fad522f1442f21a8226253ce',
    );

    const p2tr = bitcoin.payments.p2tr({
      internalPubkey: tapInternalPubkey,
      network,
    });

    expect(p2tr.pubkey).toBeDefined();
    expect(p2tr.pubkey!.toString('hex')).toEqual('fff71aebedf8ac5a3041f32a7a05bde104b8f523371be6aa63c6f9c00cc05809');

    expect(p2tr.output).toBeDefined();
    expect(p2tr.output!.toString('hex')).toEqual(
      '5120fff71aebedf8ac5a3041f32a7a05bde104b8f523371be6aa63c6f9c00cc05809',
    );

    expect(p2tr.address).toBeDefined();
    expect(p2tr.address).toEqual('tb1pllm346ldlzk95vzp7v485pdauyzt3afrxud7d2nrcmuuqrxqtqysepxvl0');
  });
});
