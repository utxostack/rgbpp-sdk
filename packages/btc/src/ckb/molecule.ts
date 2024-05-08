import { bytes, BytesLike, UnpackResult } from '@ckb-lumos/codec';
import { RGBPPLock } from '@rgbpp-sdk/ckb';
import { ErrorCodes, TxBuildError } from '../error';
import { remove0x } from '../utils';

/**
 * Unpack RgbppLockArgs from a BytesLike (Buffer, Uint8Array, HexString, etc) value.
 */
export function unpackRgbppLockArgs(source: BytesLike): UnpackResult<typeof RGBPPLock> {
  try {
    const unpacked = RGBPPLock.unpack(source);
    const reversedTxId = bytes.bytify(unpacked.btcTxid).reverse();
    return {
      btcTxid: bytes.hexify(reversedTxId),
      outIndex: unpacked.outIndex,
    };
  } catch {
    const sourceHex = remove0x(bytes.hexify(bytes.bytify(source)));
    throw TxBuildError.withComment(ErrorCodes.CKB_RGBPP_LOCK_UNPACK_ERROR, sourceHex);
  }
}
