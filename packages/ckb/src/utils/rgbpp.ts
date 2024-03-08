import { sha256 } from 'js-sha256';
import { Hex, BtcTransferCkbVirtualTx } from '../types';
import { append0x, remove0x, u16ToLe, u32ToLe, u8ToHex, utf8ToHex } from './hex';
import { getRgbppLockScript } from '../constants';
import { hexToBytes, serializeOutPoint, serializeOutputs, serializeScript } from '@nervosnetwork/ckb-sdk-utils';
import { blockchain } from '@ckb-lumos/base';

export const genRgbppLockScript = (rgbppLockArgs: Hex, isMainnet?: boolean) => {
  return {
    ...getRgbppLockScript(isMainnet),
    args: append0x(rgbppLockArgs),
  } as CKBComponents.Script;
};

export const BTC_JUMP_LOCK_TIME = 6;
export const genBtcTimeLockScript = (toLock: CKBComponents.Script, isMainnet?: boolean) => {
  const lockArgs = `${append0x(serializeScript(toLock))}${u32ToLe(6)}`;
  return {
    ...getRgbppLockScript(isMainnet),
    args: lockArgs,
  } as CKBComponents.Script;
};

// refer to https://github.com/ckb-cell/rgbpp/blob/0c090b039e8d026aad4336395b908af283a70ebf/contracts/rgbpp-lock/src/main.rs#L173-L211
export const calculateCommitment = (rgbppVirtualTx: BtcTransferCkbVirtualTx | CKBComponents.RawTransaction): Hex => {
  var hash = sha256.create();
  hash.update(hexToBytes(utf8ToHex('RGB++')));
  const version = u16ToLe(0);
  const inputsLen = u8ToHex(rgbppVirtualTx.inputs.length);
  const outputsLen = u8ToHex(rgbppVirtualTx.outputs.length);
  hash.update(hexToBytes(`0x${version}${inputsLen}${outputsLen}`));
  for (const input of rgbppVirtualTx.inputs) {
    hash.update(hexToBytes(serializeOutPoint(input.previousOutput)));
  }
  hash.update(hexToBytes(serializeOutputs(rgbppVirtualTx.outputs)));
  // double sha256
  return sha256(hash.array());
};

/**
 * BTC_TIME_lock:
	  args: lock_script | after | %bitcoin_tx_id%
 *  after: Uint32, bitcoin_tx_id: Byte32
 */
export const lockScriptFromBtcTimeLockArgs = (args: Hex): CKBComponents.Script => {
  const temp = remove0x(args);
  if (temp.length <= 72) {
    throw new Error('Invalid BTC time lock args');
  }
  const lockScript = append0x(temp.substring(0, temp.length - 72));
  return blockchain.Script.unpack(lockScript);
};
