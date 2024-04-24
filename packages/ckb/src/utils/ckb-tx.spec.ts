import { describe, it, expect } from 'vitest';
import {
  calculateRgbppCellCapacity,
  calculateRgbppClusterCellCapacity,
  calculateRgbppSporeCellCapacity,
  calculateTransactionFee,
  deduplicateList,
  generateUniqueTypeArgs,
  isClusterSporeTypeSupported,
  isLockArgsSizeExceeded,
  isTypeAssetSupported,
} from './ckb-tx';
import { utf8ToHex } from '.';
import { hexToBytes } from '@nervosnetwork/ckb-sdk-utils';

describe('ckb tx utils', () => {
  it('calculateTransactionFee', () => {
    const fee1 = calculateTransactionFee(1245);
    expect(BigInt(1370)).toBe(fee1);

    const fee2 = calculateTransactionFee(1245, BigInt(1200));
    expect(BigInt(1494)).toBe(fee2);
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

    const actual = calculateRgbppCellCapacity();
    expect(actual).toBe(BigInt(254_0000_0000));
  });

  it('isClusterSporeTypeSupported', () => {
    const clusterTestnetType: CKBComponents.Script = {
      codeHash: '0x0bbe768b519d8ea7b96d58f1182eb7e6ef96c541fbd9526975077ee09f049058',
      hashType: 'data1',
      args: '0x06ec22c2def100bba3e295a1ff279c490d227151bf3166a4f3f008906c849399',
    };
    expect(isClusterSporeTypeSupported(clusterTestnetType, false)).toBe(true);

    const clusterMainnetType: CKBComponents.Script = {
      codeHash: '0x7366a61534fa7c7e6225ecc0d828ea3b5366adec2b58206f2ee84995fe030075',
      hashType: 'data1',
      args: '0x06ec22c2def100bba3e295a1ff279c490d227151bf3166a4f3f008906c849399',
    };
    expect(isClusterSporeTypeSupported(clusterMainnetType, true)).toBe(true);

    const sporeTestnetType: CKBComponents.Script = {
      codeHash: '0x685a60219309029d01310311dba953d67029170ca4848a4ff638e57002130a0d',
      hashType: 'data1',
      args: '0x06ec22c2def100bba3e295a1ff279c490d227151bf3166a4f3f008906c849399',
    };
    expect(isClusterSporeTypeSupported(sporeTestnetType, false)).toBe(true);

    const sporeMainnetType: CKBComponents.Script = {
      codeHash: '0x4a4dce1df3dffff7f8b2cd7dff7303df3b6150c9788cb75dcf6747247132b9f5',
      hashType: 'data1',
      args: '0x06ec22c2def100bba3e295a1ff279c490d227151bf3166a4f3f008906c849399',
    };
    expect(isTypeAssetSupported(sporeMainnetType, true)).toBe(true);

    const sporeMainnetErrorType: CKBComponents.Script = {
      codeHash: '0x50bd8d6680b8b9cf98b73f3c08faf8b2a21914311954118ad6609be6e78a1b95',
      hashType: 'type',
      args: '0x06ec22c2def100bba3e295a1ff279c490d227151bf3166a4f3f008906c849399',
    };
    expect(isTypeAssetSupported(sporeMainnetErrorType, true)).toBe(false);
  });

  it('isTypeAssetSupported', () => {
    const xudtTestnetType: CKBComponents.Script = {
      codeHash: '0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb',
      hashType: 'type',
      args: '0x06ec22c2def100bba3e295a1ff279c490d227151bf3166a4f3f008906c849399',
    };
    expect(isTypeAssetSupported(xudtTestnetType, false)).toBe(true);

    const xudtMainnetType: CKBComponents.Script = {
      codeHash: '0x50bd8d6680b8b9cf98b73f3c08faf8b2a21914311954118ad6609be6e78a1b95',
      hashType: 'data1',
      args: '0x06ec22c2def100bba3e295a1ff279c490d227151bf3166a4f3f008906c849399',
    };
    expect(isTypeAssetSupported(xudtMainnetType, true)).toBe(true);

    const xudtMainnetErrorType: CKBComponents.Script = {
      codeHash: '0x50bd8d6680b8b9cf98b73f3c08faf8b2a21914311954118ad6609be6e78a1b95',
      hashType: 'type',
      args: '0x06ec22c2def100bba3e295a1ff279c490d227151bf3166a4f3f008906c849399',
    };
    expect(isTypeAssetSupported(xudtMainnetErrorType, true)).toBe(false);
  });

  it('calculateRgbppCellCapacity', () => {
    const firstInput = {
      previousOutput: {
        txHash: '0x047b6894a0b7a4d7a73b1503d1ae35c51fc5fa6306776dcf22b1fb3daaa32a29',
        index: '0x0',
      },
      since: '0x0',
    };

    const typeId = generateUniqueTypeArgs(firstInput, 0);
    expect(typeId).toBe('0xdc03ec5c4086fcb813707c6dd8bf5b9848d7e335');
  });

  it('calculateRgbppClusterCellCapacity', () => {
    const clusterData = {
      name: 'Name of the cluster',
      description: 'Description of the cluster',
    };
    const capacity = calculateRgbppClusterCellCapacity(clusterData);
    expect(capacity).toBe(BigInt(212_0000_0000));
  });

  it('calculateRgbppSporeCellCapacity', () => {
    const sporeData = {
      contentType: 'text/plain',
      content: hexToBytes(utf8ToHex('First Spore')),
      clusterId: '0xbc5168a4f90116fada921e185d4b018e784dc0f6266e539a3c092321c932700a',
    };
    const capacity = calculateRgbppSporeCellCapacity(sporeData);
    expect(capacity).toBe(BigInt(319_0000_0000));
  });

  it('deduplicateList', () => {
    const rgbppLockArgsList = [
      '0x01000000c12747f21eb725b02d8ce3fd062547756b30879504093389cd74f9b3cf357f05',
      '0x01000000c12747f21eb725b02d8ce3fd062547756b30879504093389cd74f9b3cf357f05',
    ];
    expect(1).toBe(deduplicateList(rgbppLockArgsList).length);
  });
});
