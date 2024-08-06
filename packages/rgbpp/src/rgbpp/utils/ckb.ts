import { bytes, BytesLike, UnpackResult } from '@ckb-lumos/codec';
import { getXudtTypeScript, RGBPPLock } from '@rgbpp-sdk/ckb';
import { blockchain } from '@ckb-lumos/base';

export function unpackRgbppLockArgs(source: BytesLike): UnpackResult<typeof RGBPPLock> {
  const unpacked = RGBPPLock.unpack(source);
  const reversedTxId = bytes.bytify(unpacked.btcTxid).reverse();
  return {
    btcTxid: bytes.hexify(reversedTxId),
    outIndex: unpacked.outIndex,
  };
}

export function buildXudtTypeScriptHex(xudtTypeArgs: string, isMainnet: boolean): string {
  return bytes.hexify(
    blockchain.Script.pack({
      ...getXudtTypeScript(isMainnet),
      args: xudtTypeArgs,
    }),
  );
}

export function encodeCellId(txHash: string, index: string): string {
  return `${txHash}:${index}`;
}
