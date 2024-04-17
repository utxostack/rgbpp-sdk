import { describe, it, expect } from 'vitest';
import { sha256 } from 'js-sha256';
import { addressToScript, hexToBytes } from '@nervosnetwork/ckb-sdk-utils';
import {
  btcTxIdFromBtcTimeLockArgs,
  buildPreLockArgs,
  buildRgbppLockArgs,
  calculateCommitment,
  estimateWitnessSize,
  calculateRgbppTokenInfoSize,
  encodeRgbppTokenInfo,
  genBtcTimeLockArgs,
  genBtcTimeLockScript,
  lockScriptFromBtcTimeLockArgs,
  replaceLockArgsWithRealBtcTxId,
  transformSpvProof,
  throwErrorWhenTxInputsExceeded,
} from './rgbpp';
import { RgbppCkbVirtualTx } from '../types';
import { calculateUdtCellCapacity } from './ckb-tx';
import { InputsOrOutputsLenError, RgbppCkbTxInputsExceededError } from '../error';
import { remove0x } from './hex';

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
            txHash: '0x047b6894a0b7a4d7a73b1503d1ae35c51fc5fa6306776dcf22b1fb3daaa32a29',
            index: '0x0',
          },
          since: '0x0',
        },
      ],
      outputs: [
        {
          lock: {
            codeHash: '0xd5a4e241104041f6f12f11bddcf30bd7b2f818722f78353fde019f5081cd6b49',
            hashType: 'type',
            args: '0x010000000000000000000000000000000000000000000000000000000000000000000000',
          },
          capacity: '0x0000000000000000',
          type: {
            codeHash: '0xc4957f239eb3db9f5c5fb949e9dd99adbb8068b8ac7fe7ae49495486d5e5d235',
            hashType: 'type',
            args: '0x43094caf2f2bcdf6f5ab02c2de744936897278d558a2b6924db98a4f27d629e2',
          },
        },
        {
          lock: {
            codeHash: '0xd5a4e241104041f6f12f11bddcf30bd7b2f818722f78353fde019f5081cd6b49',
            hashType: 'type',
            args: '0x010000000000000000000000000000000000000000000000000000000000000000000000',
          },
          capacity: '0x0000000000000000',
          type: {
            codeHash: '0xc4957f239eb3db9f5c5fb949e9dd99adbb8068b8ac7fe7ae49495486d5e5d235',
            hashType: 'type',
            args: '0x43094caf2f2bcdf6f5ab02c2de744936897278d558a2b6924db98a4f27d629e2',
          },
        },
      ],
      outputsData: ['0x2c010000000000000000000000000000', '0xbc020000000000000000000000000000'],
    };
    const commitment = calculateCommitment(rgbppVirtualTx);
    expect('7cdecc8cc293d491a0cbf44e92feabfc29e79408c1d2f7547b334c42efe13131').toBe(commitment);

    const invalidRgbppVirtualTx: RgbppCkbVirtualTx = {
      inputs: new Array(300).fill({
        previousOutput: {
          txHash: '0x047b6894a0b7a4d7a73b1503d1ae35c51fc5fa6306776dcf22b1fb3daaa32a29',
          index: '0x0',
        },
        since: '0x0',
      }),
      outputs: [
        {
          lock: {
            codeHash: '0xd5a4e241104041f6f12f11bddcf30bd7b2f818722f78353fde019f5081cd6b49',
            hashType: 'type',
            args: '0x010000000000000000000000000000000000000000000000000000000000000000000000',
          },
          capacity: '0x0000000000000000',
          type: {
            codeHash: '0xc4957f239eb3db9f5c5fb949e9dd99adbb8068b8ac7fe7ae49495486d5e5d235',
            hashType: 'type',
            args: '0x43094caf2f2bcdf6f5ab02c2de744936897278d558a2b6924db98a4f27d629e2',
          },
        },
      ],
      outputsData: ['0xbc020000000000000000000000000000'],
    };
    try {
      calculateCommitment(invalidRgbppVirtualTx);
    } catch (error) {
      if (error instanceof InputsOrOutputsLenError) {
        expect(108).toBe(error.code);
        expect('The inputs or outputs length of RGB++ CKB virtual tx cannot be greater than 255').toBe(error.message);
      }
    }
  });

  it('genBtcTimeLockArgs', () => {
    const toLock: CKBComponents.Script = {
      args: '0x0202020202020202020202020202020202020202',
      codeHash: '0x0101010101010101010101010101010101010101010101010101010101010101',
      hashType: 'type',
    };
    const btcTxId = '0x0303030303030303030303030303030303030303030303030303030303030303';
    const after = 0x2a;
    const args = genBtcTimeLockArgs(toLock, btcTxId, after);
    expect(args).toBe(
      '0x7d00000010000000590000005d000000490000001000000030000000310000000101010101010101010101010101010101010101010101010101010101010101011400000002020202020202020202020202020202020202022a0000000303030303030303030303030303030303030303030303030303030303030303',
    );
  });

  it('genBtcTimeLockArgs2', () => {
    const toLock: CKBComponents.Script = {
      args: '0x00016c61f984f12d3c8a4f649e60acda5deda0b8837c',
      codeHash: '0xd23761b364210735c19c60561d213fb3beae2fd6172743719eff6920e020baac',
      hashType: 'type',
    };
    const btcTxId = '018025fb6989eed484774170eefa2bef1074b0c24537f992a64dbc138277bc4a';
    const after = 0x6;
    const args = genBtcTimeLockArgs(toLock, btcTxId, after);
    expect(args).toBe(
      '0x7f000000100000005b0000005f0000004b000000100000003000000031000000d23761b364210735c19c60561d213fb3beae2fd6172743719eff6920e020baac011600000000016c61f984f12d3c8a4f649e60acda5deda0b8837c060000004abc778213bc4da692f93745c2b07410ef2bfaee70417784d4ee8969fb258001',
    );
  });

  it('genBtcTimeLockArgs3', () => {
    const toAddress =
      'ckt1qrfrwcdnvssswdwpn3s9v8fp87emat306ctjwsm3nmlkjg8qyza2cqgqq9kxr7vy7yknezj0vj0xptx6thk6pwyr0sxamv6q';
    const btcTxId = 'd44e5f02bc28394b97f6d584cf9e43ba731cc049655599cbb3c1274789bf1372';
    const after = 0x6;
    const args = genBtcTimeLockArgs(addressToScript(toAddress), btcTxId, after);
    expect(args).toBe(
      '0x7f000000100000005b0000005f0000004b000000100000003000000031000000d23761b364210735c19c60561d213fb3beae2fd6172743719eff6920e020baac011600000000016c61f984f12d3c8a4f649e60acda5deda0b8837c060000007213bf894727c1b3cb99556549c01c73ba439ecf84d5f6974b3928bc025f4ed4',
    );
    const toLock = lockScriptFromBtcTimeLockArgs(args);
    expect(toLock.args).toBe('0x00016c61f984f12d3c8a4f649e60acda5deda0b8837c');

    const txId = btcTxIdFromBtcTimeLockArgs(args);
    expect(remove0x(txId)).toBe(btcTxId);
  });

  it('genBtcTimeLockScript', () => {
    const lock: CKBComponents.Script = {
      args: '0xc0a45d9d7c024adcc8076c18b3f07c08de7c42120cdb7e6cbc05a28266b15b5f',
      codeHash: '0x28e83a1277d48add8e72fadaa9248559e1b632bab2bd60b27955ebc4c03800a5',
      hashType: 'data',
    };
    const btcTimeLock = genBtcTimeLockScript(lock, false);
    expect(btcTimeLock.args).toBe(
      '0x890000001000000065000000690000005500000010000000300000003100000028e83a1277d48add8e72fadaa9248559e1b632bab2bd60b27955ebc4c03800a50020000000c0a45d9d7c024adcc8076c18b3f07c08de7c42120cdb7e6cbc05a28266b15b5f060000000000000000000000000000000000000000000000000000000000000000000000',
    );
  });

  it('lockScriptFromBtcTimeLockArgs', () => {
    const lockArgs =
      '0x7d00000010000000590000005d000000490000001000000030000000310000000101010101010101010101010101010101010101010101010101010101010101011400000002020202020202020202020202020202020202022a0000000303030303030303030303030303030303030303030303030303030303030303';
    const lock = lockScriptFromBtcTimeLockArgs(lockArgs);
    expect(lock.codeHash).toBe('0x0101010101010101010101010101010101010101010101010101010101010101');
    expect(lock.args).toBe('0x0202020202020202020202020202020202020202');
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

  it('transformSpvProof', () => {
    const expected = transformSpvProof({
      spv_client: {
        tx_hash: '0x047b6894a0b7a4d7a73b1503d1ae35c51fc5fa6306776dcf22b1fb3daaa32a29',
        index: '0xa',
      },
      proof: '0x2f061a27abcab1d1d146514ffada6a83c0d974fe0813835ad8be2a39a6b1a6ee',
    });
    expect('0x047b6894a0b7a4d7a73b1503d1ae35c51fc5fa6306776dcf22b1fb3daaa32a29').toBe(expected.spvClient.txHash);
    expect('0xa').toBe(expected.spvClient.index);
    expect('0x2f061a27abcab1d1d146514ffada6a83c0d974fe0813835ad8be2a39a6b1a6ee').toBe(expected.proof);
  });

  it('estimatedWitnessSize', () => {
    const actual = estimateWitnessSize([
      '0x000000002f061a27abcab1d1d146514ffada6a83c0d974fe0813835ad8be2a39a6b1a6ee',
      '0x010000002f061a27abcab1d1d146514ffada6a83c0d974fe0813835ad8be2a39a6b1a6ee',
      '0x01000000047b6894a0b7a4d7a73b1503d1ae35c51fc5fa6306776dcf22b1fb3daaa32a29',
      '0x010000002f061a27abcab1d1d146514ffada6a83c0d974fe0813835ad8be2a39a6b1a6ee',
    ]);
    expect(actual).toBe(15000);
  });

  it('encodeRgbppTokenInfo', () => {
    const actual = encodeRgbppTokenInfo({ decimal: 8, name: 'RGBPP Test Token', symbol: 'RTT' });
    expect(actual).toBe('0x08105247425050205465737420546f6b656e03525454');
  });

  it('calculateRgbppTokenInfoSize', () => {
    const actual = calculateRgbppTokenInfoSize({ decimal: 8, name: 'RGBPP Test Token', symbol: 'RTT' });
    expect(actual).toBe(BigInt(22));
  });

  it('throwErrorWhenTxInputsExceeded', () => {
    try {
      throwErrorWhenTxInputsExceeded(10);
    } catch (error) {
      if (error instanceof RgbppCkbTxInputsExceededError) {
        expect(109).toBe(error.code);
        expect('Please ensure the tx inputs do not exceed 10').toBe(error.message);
      }
    }
  });
});
