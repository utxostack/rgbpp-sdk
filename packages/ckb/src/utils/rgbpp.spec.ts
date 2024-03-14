import { describe, it, expect } from 'vitest';
import { sha256 } from 'js-sha256';
import { hexToBytes } from '@nervosnetwork/ckb-sdk-utils';
import {
  btcTxIdFromBtcTimeLockArgs,
  calculateCommitment,
  genBtcTimeLockScript,
  lockScriptFromBtcTimeLockArgs,
} from './rgbpp';
import { RgbppCkbVirtualTx } from '../types';
import { calculateUdtCellCapacity } from './ckb-tx';

describe('rgbpp tests', () => {
  it('sha256', async () => {
    const message = '0x2f061a27abcab1d1d146514ffada6a83c0d974fe0813835ad8be2a39a6b1a6ee';
    const hash = sha256(hexToBytes(message));
    expect(hash).toBe('c0a45d9d7c024adcc8076c18b3f07c08de7c42120cdb7e6cbc05a28266b15b5f');
  });

  // TODO: Check the hash result with the data from the rgbpp lock script test case
  it('calculateCommitment', async () => {
    const virtualTx: RgbppCkbVirtualTx = {
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

  it('genBtcTimeLockScript', async () => {
    const toLock: CKBComponents.Script = {
      args: '0xc0a45d9d7c024adcc8076c18b3f07c08de7c42120cdb7e6cbc05a28266b15b5f',
      codeHash: '0x28e83a1277d48add8e72fadaa9248559e1b632bab2bd60b27955ebc4c03800a5',
      hashType: 'data',
    };
    const lock = genBtcTimeLockScript(toLock, false);
    expect(lock.args).toBe(
      '0x5500000010000000300000003100000028e83a1277d48add8e72fadaa9248559e1b632bab2bd60b27955ebc4c03800a50020000000c0a45d9d7c024adcc8076c18b3f07c08de7c42120cdb7e6cbc05a28266b15b5f06000000',
    );
  });

  it('lockScriptFromBtcTimeLockArgs', async () => {
    const lockArgs =
      '0x490000001000000030000000310000009bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce80114000000e616d1460d634668b8ad81971c3a53e705f51e60060000003c3199f83af98669e9e6dbf421702379ae530998441a1e0d3b8a0670ef3c2aba';
    const lock = lockScriptFromBtcTimeLockArgs(lockArgs);
    expect(lock.codeHash).toBe('0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8');
    expect(lock.args).toBe('0xe616d1460d634668b8ad81971c3a53e705f51e60');
  });

  it('btcTxIdFromBtcTimeLockArgs', async () => {
    const lockArgs =
      '0x490000001000000030000000310000009bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce80114000000e616d1460d634668b8ad81971c3a53e705f51e60060000003c3199f83af98669e9e6dbf421702379ae530998441a1e0d3b8a0670ef3c2aba';
    const btcTxId = btcTxIdFromBtcTimeLockArgs(lockArgs);
    expect(btcTxId).toBe('0x3c3199f83af98669e9e6dbf421702379ae530998441a1e0d3b8a0670ef3c2aba');
  });

  it('calculateUdtCellCapacity', async () => {
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
});
