import { BytesLike, FixedBytesCodec, ObjectLayoutCodec, UnpackResult } from '@ckb-lumos/lumos/codec';
import { blockchain, struct, Uint32LE } from '@ckb-lumos/lumos/codec';
import { BIish } from '@ckb-lumos/lumos';
import { ErrorCodes, TxBuildError } from '../error';

type Fixed = {
  readonly __isFixedCodec__: true;
  readonly byteLength: number;
};

export const RgbppLockArgs: ObjectLayoutCodec<{
  outIndex: FixedBytesCodec<number, BIish>;
  btcTxId: FixedBytesCodec<string, BytesLike>;
}> &
  Fixed = struct(
  {
    outIndex: Uint32LE,
    btcTxId: blockchain.Byte32,
  },
  ['outIndex', 'btcTxId'],
);

/**
 * Unpack RgbppLockArgs from a BytesLike (Buffer, Uint8Array, HexString, etc) value.
 */
export function unpackRgbppLockArgs(source: BytesLike): UnpackResult<typeof RgbppLockArgs> {
  try {
    return RgbppLockArgs.unpack(source);
  } catch {
    throw new TxBuildError(ErrorCodes.CKB_RGBPP_LOCK_UNPACK_ERROR);
  }
}
