import { describe, it, expect } from 'vitest';
import { sha256 } from 'js-sha256';
import { hexToBytes } from '@nervosnetwork/ckb-sdk-utils';

describe('rgbpp tests', () => {
  it('sha256', async () => {
    const message = '0x2f061a27abcab1d1d146514ffada6a83c0d974fe0813835ad8be2a39a6b1a6ee';
    const hash = sha256(hexToBytes(message));
    expect(hash).toBe('c0a45d9d7c024adcc8076c18b3f07c08de7c42120cdb7e6cbc05a28266b15b5f');
  });
});
