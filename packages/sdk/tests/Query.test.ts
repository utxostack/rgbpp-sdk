import { describe, it } from 'vitest';
import { accounts, btcRpc, serviceApi, openApi } from './shared/env';

describe('Query', () => {
  describe('BtcRpc queries', () => {
    it('Get BlockchainInfo (via BtcRpc)', async () => {
      const res = await btcRpc.getBlockchainInfo();
      console.log(res);
    });
  });

  describe('UniSatOpenApi queries', () => {
    it('Get balance', async () => {
      const res = await openApi.getBalance(accounts.charlie.p2wpkh.address);
      console.log(res);
    });
    it('Get Non-inscription UTXOs', async () => {
      const res = await openApi.getUtxos(accounts.charlie.p2wpkh.address);
      console.log(res.data.utxo);
    });
  });

  describe('BtcServiceApi queries', () => {
    it('Generate token', async () => {
      const res = await serviceApi.generateToken();
      console.log(res);
    }, 0);
    it('Get balance', async () => {
      const res = await serviceApi.getBalance(accounts.charlie.p2wpkh.address);
      console.log(res);
    });
    it('Get UTXOs', async () => {
      const res = await serviceApi.getUtxos(accounts.charlie.p2wpkh.address);
      console.log(res);
    });
  });
});
