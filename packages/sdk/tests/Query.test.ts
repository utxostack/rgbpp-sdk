import { describe, it } from 'vitest';
import { accounts, btcRpc, openApi } from './shared/env';

describe('Query', () => {
  it('Get BlockchainInfo', async () => {
    const res = await btcRpc.getBlockchainInfo();
    console.log(res);
  });
  it('Get balance', async () => {
    const res = await openApi.getBalance(accounts.charlie.p2wpkh.address);
    console.log(res);
  });
  it('Get Non-inscription UTXOs', async () => {
    const res = await openApi.getUtxos(accounts.charlie.p2wpkh.address);
    console.log(res.data.utxo);
  });
});
