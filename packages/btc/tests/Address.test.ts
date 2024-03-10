import { describe, expect, it } from 'vitest';
import { bitcoin, ECPair, toXOnly } from '../src';
import { network } from './shared/env';

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

    const decoded = bitcoin.address.fromBech32(address!);
    const restorePayment = bitcoin.payments.p2wpkh({
      hash: decoded.data,
      network,
    });

    const scriptPk = bitcoin.address.toOutputScript(address!, network);
    console.log(decoded.data.toString('hex'), keyPair.publicKey.toString('hex'));
  });
  it('Taproot address', () => {
    const keyPair = ECPair.fromPrivateKey(
      Buffer.from('8d3c23d340ac0841e6c3b58a9bbccb9a28e94ab444f972cff35736fa2fcf9f3f', 'hex'),
      { network },
    );

    const { address, pubkey } = bitcoin.payments.p2tr({
      internalPubkey: toXOnly(keyPair.publicKey),
      network,
    });

    console.log(address);
    console.log(keyPair.publicKey.toString('hex'));
    console.log(pubkey?.toString('hex'));

    const decoded = bitcoin.address.fromBech32(address!);
    const restorePayment = bitcoin.payments.p2tr({
      // hash: decoded.data,
      address,
      network,
    });
    console.log(
      restorePayment.address,
      restorePayment.pubkey!.toString('hex'),
      restorePayment.internalPubkey?.toString('hex'),
    );
  });
});
