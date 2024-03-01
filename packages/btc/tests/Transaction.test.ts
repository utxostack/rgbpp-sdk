import { describe, it } from 'vitest';
import { accounts, networkType, assetsApi } from './shared/env';
import { DataSource, sendBtc } from '../src';

describe('Transaction', () => {
  it('Transfer BTC from P2WPKH address', async () => {
    const source = new DataSource(assetsApi, networkType);
    const psbt = await sendBtc({
      from: accounts.charlie.p2wpkh.address,
      tos: [
        {
          address: accounts.charlie.p2wpkh.address,
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
    const res = await assetsApi.sendTransaction(tx.toHex());
    console.log('txid:', res.txid);
    console.log(`explorer: https://mempool.space/testnet/tx/${res.txid}`);
  }, 0);
});
