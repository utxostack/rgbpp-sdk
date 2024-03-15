import { sha256 } from 'js-sha256';
import { Hex, IndexerCell, RgbppCkbVirtualTx } from '../types';
import { append0x, remove0x, u32ToLe, utf8ToHex } from './hex';
import {
  BTC_JUMP_CONFIRMATION_BLOCKS,
  RGBPP_TX_ID_PLACEHOLDER,
  getBtcTimeLockScript,
  getRgbppLockScript,
} from '../constants';
import { hexToBytes, serializeOutPoint, serializeOutput, serializeScript } from '@nervosnetwork/ckb-sdk-utils';
import { blockchain } from '@ckb-lumos/base';

export const genRgbppLockScript = (rgbppLockArgs: Hex, isMainnet: boolean) => {
  return {
    ...getRgbppLockScript(isMainnet),
    args: append0x(rgbppLockArgs),
  } as CKBComponents.Script;
};

export const genBtcTimeLockScript = (toLock: CKBComponents.Script, isMainnet: boolean) => {
  const lockArgs = `${append0x(serializeScript(toLock))}${u32ToLe(BTC_JUMP_CONFIRMATION_BLOCKS)}`;
  return {
    ...getRgbppLockScript(isMainnet),
    args: lockArgs,
  } as CKBComponents.Script;
};

// refer to https://github.com/ckb-cell/rgbpp/blob/0c090b039e8d026aad4336395b908af283a70ebf/contracts/rgbpp-lock/src/main.rs#L173-L211
export const calculateCommitment = (rgbppVirtualTx: RgbppCkbVirtualTx | CKBComponents.RawTransaction): Hex => {
  var hash = sha256.create();
  hash.update(hexToBytes(utf8ToHex('RGB++')));
  const version = [0, 0];
  hash.update(version);
  hash.update([rgbppVirtualTx.inputs.length, rgbppVirtualTx.outputs.length]);

  for (const input of rgbppVirtualTx.inputs) {
    hash.update(hexToBytes(serializeOutPoint(input.previousOutput)));
  }
  for (let index = 0; index < rgbppVirtualTx.outputs.length; index++) {
    const output = rgbppVirtualTx.outputs[index];
    const outputData = rgbppVirtualTx.outputsData[index];
    hash.update(hexToBytes(serializeOutput(output)));
    hash.update(hexToBytes(outputData));
  }
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
  return blockchain.Script.unpack(lockScript) as CKBComponents.Script;
};

export const btcTxIdFromBtcTimeLockArgs = (args: Hex): Hex => {
  const temp = remove0x(args);
  if (temp.length <= 72) {
    throw new Error('Invalid BTC time lock args');
  }
  const btcTxId = append0x(temp.substring(temp.length - 64));
  return btcTxId;
};

export const isRgbppLockOrBtcTimeLock = (lock: CKBComponents.Script, isMainnet: boolean) => {
  const rgbppLock = getRgbppLockScript(isMainnet);
  const isRgbppLock = lock.codeHash === rgbppLock.codeHash && lock.hashType === rgbppLock.hashType;

  const btcTimeLock = getBtcTimeLockScript(isMainnet);
  const isBtcTimeLock = lock.codeHash === btcTimeLock.codeHash && lock.hashType === btcTimeLock.hashType;

  return isRgbppLock || isBtcTimeLock;
};

export const buildPreLockArgs = (outIndex: number | string) => {
  if (typeof outIndex === 'number') {
    return `${u32ToLe(outIndex)}${RGBPP_TX_ID_PLACEHOLDER}`;
  }
  return `${outIndex}${RGBPP_TX_ID_PLACEHOLDER}`;
};

export const compareInputs = (a: IndexerCell, b: IndexerCell) => {
  if (a.output.lock.args < b.output.lock.args) {
    return -1;
  }
  if (a.output.lock.args > b.output.lock.args) {
    return 1;
  }
  return 0;
};
