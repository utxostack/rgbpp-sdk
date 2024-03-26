import { describe, it, expect } from 'vitest';
import { calculateRgbppCellCapacity, calculateTransactionFee, isLockArgsSizeExceeded } from './ckb-tx';

describe('ckb tx utils', () => {
  it('calculateTransactionFee', () => {
    const fee = calculateTransactionFee(1245);
    expect(BigInt(1370)).toBe(fee);
  });

  it('calculateTransactionFee', () => {
    const longLockArgs = '0x06ec22c2def100bba3e295a1ff279c490d227151bf3166a4f3f008906c849399';
    expect(true).toBe(isLockArgsSizeExceeded(longLockArgs));

    const shortLockArgs = '0x06ec22c2def100bba3e295a1ff279c490d227151bf3166a4f3';
    expect(false).toBe(isLockArgsSizeExceeded(shortLockArgs));
  });

  it('calculateRgbppCellCapacity', () => {
    const xudtType: CKBComponents.Script = {
      codeHash: '0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb',
      hashType: 'type',
      args: '0x06ec22c2def100bba3e295a1ff279c490d227151bf3166a4f3f008906c849399',
    };
    const capacity = calculateRgbppCellCapacity(xudtType);
    expect(BigInt(254_0000_0000)).toBe(capacity);
  });
});
