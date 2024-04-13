import { describe, it, expect } from 'vitest';
import { generateClusterId } from './spore';

describe('spore utils', () => {
  it('generateClusterId', () => {
    const firstInput = {
      previousOutput: {
        txHash: '0x047b6894a0b7a4d7a73b1503d1ae35c51fc5fa6306776dcf22b1fb3daaa32a29',
        index: '0x0',
      },
      since: '0x0',
    };

    const typeId = generateClusterId(firstInput, 0);
    expect(typeId).toBe('0xdc03ec5c4086fcb813707c6dd8bf5b9848d7e335e9c39389bfc9e6f9e65150ca');
  });
});
