import { describe, it, expect } from 'vitest';
import { encodeCellId, decodeCellId } from './id';

describe('cell id', () => {
  it('encodeCellId', () => {
    expect(encodeCellId('0x7610efaec3b9ce66349909fea88a1ae78cd488de3128bc6f71afc068306e0e65', '0x0')).toBe(
      '0x7610efaec3b9ce66349909fea88a1ae78cd488de3128bc6f71afc068306e0e65:0x0',
    );
    expect(encodeCellId('0x7610efaec3b9ce66349909fea88a1ae78cd488de3128bc6f71afc068306e0e65', '0xffffffff')).toBe(
      '0x7610efaec3b9ce66349909fea88a1ae78cd488de3128bc6f71afc068306e0e65:0xffffffff',
    );

    expect(() =>
      encodeCellId('0x7610efaec3b9ce66349909fea88a1ae78cd488de3128bc6f71afc068306e0e6', '0x0'),
    ).toThrowError();
    expect(() =>
      encodeCellId('0x7610efaec3b9ce66349909fea88a1ae78cd488de3128bc6f71afc068306e0e65', '0xffffffff01'),
    ).toThrowError();
    expect(() =>
      encodeCellId('7610efaec3b9ce66349909fea88a1ae78cd488de3128bc6f71afc068306e0e65', '0x0'),
    ).toThrowError();
    expect(() =>
      encodeCellId('0x7610efaec3b9ce66349909fea88a1ae78cd488de3128bc6f71afc068306e0e65', '0'),
    ).toThrowError();
  });
  it('decodeCellId', () => {
    expect(decodeCellId('0x7610efaec3b9ce66349909fea88a1ae78cd488de3128bc6f71afc068306e0e65:0x0')).toStrictEqual({
      txHash: '0x7610efaec3b9ce66349909fea88a1ae78cd488de3128bc6f71afc068306e0e65',
      index: '0x0',
    });
    expect(decodeCellId('0x7610efaec3b9ce66349909fea88a1ae78cd488de3128bc6f71afc068306e0e65:0xffffffff')).toStrictEqual(
      {
        txHash: '0x7610efaec3b9ce66349909fea88a1ae78cd488de3128bc6f71afc068306e0e65',
        index: '0xffffffff',
      },
    );

    expect(() => decodeCellId('0x7610efaec3b9ce66349909fea88a1ae78cd488de3128bc6f71afc068306e0e6:0x0')).toThrowError();
    expect(() =>
      decodeCellId('0x7610efaec3b9ce66349909fea88a1ae78cd488de3128bc6f71afc068306e0e65:0xffffffff01'),
    ).toThrowError();
    expect(() => decodeCellId('7610efaec3b9ce66349909fea88a1ae78cd488de3128bc6f71afc068306e0e65:0x0')).toThrowError();
    expect(() => decodeCellId('0x7610efaec3b9ce66349909fea88a1ae78cd488de3128bc6f71afc068306e0e65:0')).toThrowError();
  });
});
