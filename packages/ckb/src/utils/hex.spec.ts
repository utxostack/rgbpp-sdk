import { describe, it, expect } from 'vitest';
import { leToU128, u128ToLe, u32ToLe, u64ToLe } from './hex';

describe('number to little endian', () => {
  it('u32toLe', async () => {
    const expected = u32ToLe(21000000);
    expect('406f4001').toBe(expected);
  });

  it('u64ToLe', async () => {
    const expected = u64ToLe(BigInt(21000000));
    expect('406f400100000000').toBe(expected);
  });

  it('u128ToLe', async () => {
    const expected = u128ToLe(BigInt(2100_0000) * BigInt(10 ** 8));
    expect('0040075af07507000000000000000000').toBe(expected);
  });

  it('leToU128', async () => {
    const expected = leToU128('0x00b864d9450000000000000000000000');
    expect(BigInt(3000_0000_0000)).toBe(expected);
  });
});
