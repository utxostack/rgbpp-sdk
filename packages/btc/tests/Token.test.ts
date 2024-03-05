import { describe, expect, it } from 'vitest';
import { BtcAssetsApi, ErrorCodes, ErrorMessages } from '../src';

describe('Token', () => {
  describe(
    'token test',
    {
      retry: 3,
    },
    () => {
      it('Generate a valid token', async () => {
        const serviceWithApp = new BtcAssetsApi({
          url: process.env.VITE_SERVICE_URL!,
          domain: 'btc-test.app',
          app: 'btc-test-app',
        });

        const res = await serviceWithApp.generateToken();
        expect(typeof res.token).toBe('string');
        // TODO: check if the token works
      });

      it('Missing parameters to generate tokens should throw error', async () => {
        const serviceWithoutApp = new BtcAssetsApi({
          url: process.env.VITE_SERVICE_URL!,
          app: '',
          domain: 'btc-test.app',
        });

        await expect(async () => serviceWithoutApp.generateToken()).rejects.toThrow(
          `${ErrorMessages[ErrorCodes.ASSETS_API_INVALID_PARAM]}: app, domain`,
        );
      });
    },
  );
});
