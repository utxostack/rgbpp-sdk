import { describe, it } from 'vitest';
import { accounts, btcRpc, openApi } from './shared/env';
import { MIN_COLLECTABLE_SATOSHIS, NetworkType, sendBtc } from '../src';

describe('Transaction', () => {
  it('Create SegWit BTC transfer', async () => {
    const psbt = await sendBtc({
      from: accounts.charlie.p2wpkh.address,
      tos: [
        {
          address: accounts.charlie.p2wpkh.address,
          value: 1000,
        },
      ],
      networkType: NetworkType.TESTNET,
      fee: 200,
      openApi,
    });

    console.log(psbt.txOutputs);

    // Sign & finalize inputs
    psbt.signAllInputs(accounts.charlie.keyPair);
    psbt.finalizeAllInputs();

    // Broadcast transaction
    const tx = psbt.extractTransaction();
    const res = await btcRpc.sendRawTransaction(tx.toHex());
    console.log(res);
  });
});
