import { BytesLike, UnpackResult } from '@ckb-lumos/lumos/codec';
import { RGBPPLock } from '@rgbpp-sdk/ckb';
import { ErrorCodes, TxBuildError } from '../error';

/**
 * Unpack RgbppLockArgs from a BytesLike (Buffer, Uint8Array, HexString, etc) value.
 */
export function unpackRgbppLockArgs(source: BytesLike): UnpackResult<typeof RGBPPLock> {
  try {
    return RGBPPLock.unpack(source);
  } catch {
    throw new TxBuildError(ErrorCodes.CKB_RGBPP_LOCK_UNPACK_ERROR);
  }
}
