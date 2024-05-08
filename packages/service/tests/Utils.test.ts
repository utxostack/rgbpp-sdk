import { describe, expect, it } from 'vitest';
import { BtcAssetsApiError, ErrorCodes, isDomain } from '../src';

describe('Utils', () => {
  it('isDomain()', () => {
    expect(isDomain('google.com')).toBe(true);
    expect(isDomain('mail.google.com')).toBe(true);
    expect(isDomain('https://google.com')).toBe(false);
    expect(isDomain('google.com/path')).toBe(false);
    expect(isDomain('google')).toBe(false);

    expect(isDomain('localhost', true)).toBe(true);
    expect(isDomain('localhost')).toBe(false);
  });
  it('BtcAssetsApiError with context', () => {
    try {
      throw BtcAssetsApiError.withComment(ErrorCodes.ASSETS_API_INVALID_PARAM, 'param1, param2', {
        request: {
          url: 'https://api.com/api/v1/route',
          params: {
            param1: 'value1',
            param2: 'value2',
          },
        },
        response: {
          status: 400,
          data: {
            error: -10,
            message: 'error message about -10',
          },
        },
      });
    } catch (e) {
      expect(e).toBeInstanceOf(BtcAssetsApiError);
      expect(e.toString()).toEqual('Error: Invalid param(s) was provided to the BtcAssetsAPI: param1, param2');

      if (e instanceof BtcAssetsApiError) {
        expect(e.code).toEqual(ErrorCodes.ASSETS_API_INVALID_PARAM);
        expect(e.message).toEqual('Invalid param(s) was provided to the BtcAssetsAPI: param1, param2');

        expect(e.context).toBeDefined();
        expect(e.context.request).toBeDefined();
        expect(e.context.request.url).toEqual('https://api.com/api/v1/route');
        expect(e.context.request.params).toEqual({
          param1: 'value1',
          param2: 'value2',
        });

        expect(e.context.response).toBeDefined();
        expect(e.context.response.status).toEqual(400);
        expect(e.context.response.data).toEqual({
          error: -10,
          message: 'error message about -10',
        });
      }
    }
  });
});
