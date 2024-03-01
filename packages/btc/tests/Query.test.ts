import { describe, it } from 'vitest';
import { accounts, assetsApi } from './shared/env';

describe('Query', () => {
  describe('BtcServiceApi queries', () => {
    it('Generate token', async () => {
      const res = await assetsApi.generateToken();
      console.log(res);
    }, 0);
    it('Get balance', async () => {
      const res = await assetsApi.getBalance(accounts.charlie.p2wpkh.address);
      console.log(res);
    }, 0);
    it('Get UTXOs', async () => {
      const res = await assetsApi.getUtxos(accounts.charlie.p2wpkh.address);
      console.log(res);
    });
  });
});
