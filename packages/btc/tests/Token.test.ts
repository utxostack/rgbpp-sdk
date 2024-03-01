import { describe, expect, it } from 'vitest';
import { BtcAssetsApi } from '../src';

describe('Token', () => {
  describe('token test', () => {
    it('Generate token', async () => {
      const btcAssetsApiWithApp = new BtcAssetsApi({
        url: process.env.VITE_SERVICE_URL!,
        app: 'your_app',
        domain: 'your_domain',
      });

      const res = await btcAssetsApiWithApp.generateToken();
      expect(res.token).toBeDefined();
      expect(typeof res.token).toBe('string');
      expect(res.token.length).toBeGreaterThan(0);
    });

    it('Missing parameters to generate tokens should throw error', async () => {
      const btcAssetsApiWithoutApp = new BtcAssetsApi({
        url: process.env.VITE_SERVICE_URL!,
        app: '',
        domain: 'your_domain',
      });

      try {
        await btcAssetsApiWithoutApp.generateToken();
        throw new Error('Expected generateToken() to throw an error');
      } catch (error) {
        const err = error as Error;
        expect(err.message).toBe('AssetsAPI requires "app" and "domain"');
      }
    });
  });
});
