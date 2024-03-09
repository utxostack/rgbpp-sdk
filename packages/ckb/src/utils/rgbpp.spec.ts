import { describe, it, expect } from 'vitest';
import { sha256 } from 'js-sha256';
import { hexToBytes } from '@nervosnetwork/ckb-sdk-utils';
import { calculateCommitment } from './rgbpp';
import { BtcTransferCkbVirtualTx } from '../types';

describe('rgbpp tests', () => {
  it('sha256', async () => {
    const message = '0x2f061a27abcab1d1d146514ffada6a83c0d974fe0813835ad8be2a39a6b1a6ee';
    const hash = sha256(hexToBytes(message));
    expect(hash).toBe('c0a45d9d7c024adcc8076c18b3f07c08de7c42120cdb7e6cbc05a28266b15b5f');
  });

  // TODO: Check the hash result with the data from the rgbpp lock script test case
  it('calculateCommitment', async () => {
    const virtualTx: BtcTransferCkbVirtualTx = {
      inputs: [
        {
          previousOutput: {
            index: '0xffffffff',
            txHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
          },
          since: '0x400',
        },
      ],
      outputs: [
        {
          capacity: '0x18e64b61cf',
          lock: {
            args: '0x',
            codeHash: '0x28e83a1277d48add8e72fadaa9248559e1b632bab2bd60b27955ebc4c03800a5',
            hashType: 'data',
          },
          type: {
            args: '0x',
            codeHash: '0x28e83a1277d48add8e72fadaa9248559e1b632bab2bd60b27955ebc4c03800a5',
            hashType: 'data',
          },
        },
      ],
      outputsData: ['0xc0a45d9d7c024adcc8076c18b3f07c08de7c42120cdb7e6cbc05a28266b15b5f'],
    };
    const hash = calculateCommitment(virtualTx);
    expect(hash).toBe('6c6077f12059b6d8534a3a6e893a2268fe12d3456d1bf5c029fe66615e016c21');
  });
});
