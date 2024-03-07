import { sha256 } from 'js-sha256';
import { Hex, RgbppL1TransferVirtualTx } from '../types';
import { append0x, u16ToLe, u8ToHex, utf8ToHex } from './hex';
import { getRgbppLockScript } from '../constants';
import { serializeOutPoint, serializeOutputs } from '@nervosnetwork/ckb-sdk-utils';

export const genRgbppLockScript = (rgbppLockArgs: Hex, isMainnet?: boolean) => {
  return {
    ...getRgbppLockScript(isMainnet),
    args: append0x(rgbppLockArgs),
  } as CKBComponents.Script;
};

export const calculateCommitment = (rgbppVirtualTx: RgbppL1TransferVirtualTx) => {
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
  return hash.hex();
};

export const calculateCommitmentWithRawTx = (rawTx: CKBComponents.RawTransaction) => {
  const virtualTx: RgbppL1TransferVirtualTx = {
    ...rawTx,
  };
  return calculateCommitment(virtualTx);
};
