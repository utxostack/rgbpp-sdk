import { sha256 } from 'js-sha256';
import { Hex, BtcTransferCkbVirtualTx } from '../types';
import { append0x, u16ToLe, u8ToHex, utf8ToHex } from './hex';
import { getRgbppLockScript } from '../constants';
import { serializeOutPoint, serializeOutputs } from '@nervosnetwork/ckb-sdk-utils';

export const genRgbppLockScript = (rgbppLockArgs: Hex, isMainnet?: boolean) => {
  return {
    ...getRgbppLockScript(isMainnet),
    args: append0x(rgbppLockArgs),
  } as CKBComponents.Script;
};

// refer to https://github.com/ckb-cell/rgbpp/blob/0c090b039e8d026aad4336395b908af283a70ebf/contracts/rgbpp-lock/src/main.rs#L173-L211
export const calculateCommitment = (rgbppVirtualTx: BtcTransferCkbVirtualTx | CKBComponents.RawTransaction): Hex => {
  var hash = sha256.create();
  hash.update(utf8ToHex('RGB++'));
  const version = u16ToLe(0);
  const inputsLen = u8ToHex(rgbppVirtualTx.inputs.length);
  const outputsLen = u8ToHex(rgbppVirtualTx.outputs.length);
  hash.update(append0x(`${version}${inputsLen}${outputsLen}`));
  for (const input of rgbppVirtualTx.inputs) {
    hash.update(serializeOutPoint(input.previousOutput));
  }
  hash.update(serializeOutputs(rgbppVirtualTx.outputs));
  const result = append0x(hash.hex());
  // double sha256
  return sha256(result);
};
