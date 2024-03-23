import { describe, it, expect } from 'vitest';
import { sha256 } from 'js-sha256';
import { hexToBytes } from '@nervosnetwork/ckb-sdk-utils';
import {
  btcTxIdFromBtcTimeLockArgs,
  buildPreLockArgs,
  buildRgbppLockArgs,
  calculateCommitment,
  genBtcTimeLockScript,
  lockScriptFromBtcTimeLockArgs,
  replaceLockArgsWithRealBtcTxId,
} from './rgbpp';
import { RgbppCkbVirtualTx } from '../types';
import { calculateUdtCellCapacity } from './ckb-tx';

describe('rgbpp tests', () => {
  it('sha256', () => {
    const message = '0x2f061a27abcab1d1d146514ffada6a83c0d974fe0813835ad8be2a39a6b1a6ee';
    const hash = sha256(hexToBytes(message));
    expect(hash).toBe('c0a45d9d7c024adcc8076c18b3f07c08de7c42120cdb7e6cbc05a28266b15b5f');
  });

  it('calculateCommitment with the test data which is from RGBPP lock contract test cases', () => {
    const rgbppVirtualTx: RgbppCkbVirtualTx = {
      inputs: [
        {
          previousOutput: {
            txHash: '0xb93dc09afbb463577ca0149726840f204f4cb29490d115a1cf8c1018f05f5296',
            index: '0x0',
          },
          since: '0x0',
        },
      ],
      outputs: [
        {
          lock: {
            codeHash: '0x6baadd6f224432eec24b4031b66e1bcef690963205ec3edf6aa0b35570c429f6',
            hashType: 'type',
            args: '0x010000000000000000000000000000000000000000000000000000000000000000000000',
          },
          capacity: '0x0000000000000000',
          type: {
            codeHash: '0xdb9b4c309f25738b21e7278c803e00a7dcf81115f448ae87b42463f4136821e7',
            hashType: 'type',
            args: '0x385c913dd83f7255922df8f5126511652a3ecf7e015849d9cb90558d9b81c5c2',
          },
        },
        {
          lock: {
            codeHash: '0x6baadd6f224432eec24b4031b66e1bcef690963205ec3edf6aa0b35570c429f6',
            hashType: 'type',
            args: '0x010000000000000000000000000000000000000000000000000000000000000000000000',
          },
          capacity: '0x0000000000000000',
          type: {
            codeHash: '0xdb9b4c309f25738b21e7278c803e00a7dcf81115f448ae87b42463f4136821e7',
            hashType: 'type',
            args: '0x385c913dd83f7255922df8f5126511652a3ecf7e015849d9cb90558d9b81c5c2',
          },
        },
      ],
      outputsData: ['0x2c010000000000000000000000000000', '0xbc020000000000000000000000000000'],
    };
    const commitment = calculateCommitment(rgbppVirtualTx);
    expect('150c5f0856ba6d9148bd2588d8a3d9a1f45eec8a34fe0ca426a1b5193d5a701c').toBe(commitment);
  });

  it('genBtcTimeLockScript', () => {
    const toLock: CKBComponents.Script = {
      args: '0xc0a45d9d7c024adcc8076c18b3f07c08de7c42120cdb7e6cbc05a28266b15b5f',
      codeHash: '0x28e83a1277d48add8e72fadaa9248559e1b632bab2bd60b27955ebc4c03800a5',
      hashType: 'data',
    };
    const lock = genBtcTimeLockScript(toLock, false);
    expect(lock.args).toBe(
      '0x850000001000000061000000650000005100000010000000300000003100000028e83a1277d48add8e72fadaa9248559e1b632bab2bd60b27955ebc4c03800a500c0a45d9d7c024adcc8076c18b3f07c08de7c42120cdb7e6cbc05a28266b15b5f060000000000000000000000000000000000000000000000000000000000000000000000',
    );
  });

  it('lockScriptFromBtcTimeLockArgs', () => {
    const lockArgs =
      '0x850000001000000061000000650000005100000010000000300000003100000028e83a1277d48add8e72fadaa9248559e1b632bab2bd60b27955ebc4c03800a500c0a45d9d7c024adcc8076c18b3f07c08de7c42120cdb7e6cbc05a28266b15b5f060000000000000000000000000000000000000000000000000000000000000000000000';
    const lock = lockScriptFromBtcTimeLockArgs(lockArgs);
    expect(lock.codeHash).toBe('0x28e83a1277d48add8e72fadaa9248559e1b632bab2bd60b27955ebc4c03800a5');
    expect(lock.args).toBe('0xc0a45d9d7c024adcc8076c18b3f07c08de7c42120cdb7e6cbc05a28266b15b5f');
  });

  it('btcTxIdFromBtcTimeLockArgs', () => {
    const lockArgs =
      '0x850000001000000061000000650000005100000010000000300000003100000028e83a1277d48add8e72fadaa9248559e1b632bab2bd60b27955ebc4c03800a500c0a45d9d7c024adcc8076c18b3f07c08de7c42120cdb7e6cbc05a28266b15b5f0600000006ec22c2def100bba3e295a1ff279c490d227151bf3166a4f3f008906c849399';
    const btcTxId = btcTxIdFromBtcTimeLockArgs(lockArgs);
    expect(btcTxId).toBe('0x9993846c9008f0f3a46631bf5171220d499c27ffa195e2a3bb00f1dec222ec06');
  });

  it('calculateUdtCellCapacity', () => {
    const joyIDLock: CKBComponents.Script = {
      codeHash: '0xd23761b364210735c19c60561d213fb3beae2fd6172743719eff6920e020baac',
      hashType: 'type',
      args: '0x0001f21be6c96d2103946d37a1ee882011f7530a92a7',
    };
    const xudtType: CKBComponents.Script = {
      codeHash: '0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb',
      hashType: 'type',
      args: '0x06ec22c2def100bba3e295a1ff279c490d227151bf3166a4f3f008906c849399',
    };
    const capacity = calculateUdtCellCapacity(joyIDLock, xudtType);
    expect(BigInt(145_0000_0000)).toBe(capacity);
  });

  it('buildRgbppLockArgs', () => {
    const expected = buildRgbppLockArgs(2, '0x9993846c9008f0f3a46631bf5171220d499c27ffa195e2a3bb00f1dec222ec06');
    expect('0x0200000006ec22c2def100bba3e295a1ff279c490d227151bf3166a4f3f008906c849399').toBe(expected);
  });

  it('buildPreLockArgs', () => {
    expect('0x020000000000000000000000000000000000000000000000000000000000000000000000').toBe(buildPreLockArgs(2));
  });

  it('replaceRealBtcTxId', () => {
    const rgbppLockArgs = '0x020000000000000000000000000000000000000000000000000000000000000000000000';
    const realBtcTxId = '0x9993846c9008f0f3a46631bf5171220d499c27ffa195e2a3bb00f1dec222ec06';
    const lockArgs = replaceLockArgsWithRealBtcTxId(rgbppLockArgs, realBtcTxId);
    expect('0x0200000006ec22c2def100bba3e295a1ff279c490d227151bf3166a4f3f008906c849399').toBe(lockArgs);

    const btcTimeLockArgs =
      '0x850000001000000061000000650000005100000010000000300000003100000028e83a1277d48add8e72fadaa9248559e1b632bab2bd60b27955ebc4c03800a500c0a45d9d7c024adcc8076c18b3f07c08de7c42120cdb7e6cbc05a28266b15b5f060000000000000000000000000000000000000000000000000000000000000000000000';
    const args = replaceLockArgsWithRealBtcTxId(btcTimeLockArgs, realBtcTxId);
    expect(
      '0x850000001000000061000000650000005100000010000000300000003100000028e83a1277d48add8e72fadaa9248559e1b632bab2bd60b27955ebc4c03800a500c0a45d9d7c024adcc8076c18b3f07c08de7c42120cdb7e6cbc05a28266b15b5f0600000006ec22c2def100bba3e295a1ff279c490d227151bf3166a4f3f008906c849399',
    ).toBe(args);
  });
});
