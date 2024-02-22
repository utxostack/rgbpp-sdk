import bitcoin from 'bitcoinjs-lib';
import { describe, expect, it } from 'vitest';
import { ECPair, network } from './shared/env';

describe('Address', () => {
  it('Create SegWit address', () => {
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
});
