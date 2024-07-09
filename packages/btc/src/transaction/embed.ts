import { remove0x } from '../utils.js';
import { bitcoin } from '../bitcoin.js';
import { ErrorCodes, TxBuildError } from '../error.js';

/**
 * Convert data to OP_RETURN script pubkey.
 * The data size should be ranged in 1 to 80 bytes.
 *
 * @example
 * const data = Buffer.from('01020304', 'hex');
 * const scriptPk = dataToOpReturnScriptPubkey(data); // <Buffer 6a 04 01 02 03 04>
 * const scriptPkHex = scriptPk.toString('hex'); // 6a0401020304
 */
export function dataToOpReturnScriptPubkey(data: Buffer | string): Buffer {
  if (typeof data === 'string') {
    data = Buffer.from(remove0x(data), 'hex');
  }

  const payment = bitcoin.payments.embed({ data: [data] });
  return payment.output!;
}

/**
 * Get data from a OP_RETURN script pubkey.
 *
 * @example
 * const scriptPk = Buffer.from('6a0401020304', 'hex');
 * const data = opReturnScriptPubKeyToData(scriptPk); // <Buffer 01 02 03 04>
 * const hex = data.toString('hex'); // 01020304
 */
export function opReturnScriptPubKeyToData(script: Buffer): Buffer {
  if (!isOpReturnScriptPubkey(script)) {
    throw TxBuildError.withComment(ErrorCodes.UNSUPPORTED_OP_RETURN_SCRIPT, script.toString('hex'));
  }

  const res = bitcoin.script.decompile(script)!;
  return res[1] as Buffer;
}

/**
 * Check if a script pubkey is an OP_RETURN script.
 *
 * A valid OP_RETURN script should have the following structure:
 * - <OP_RETURN code> <size: n> <data of n bytes>
 * - <OP_RETURN code> <OP_PUSHDATA1> <size: n> <data of n bytes>
 *
 * @example
 * // <OP_RETURN> <size: 0x04> <data: 01020304>
 * isOpReturnScriptPubkey(Buffer.from('6a0401020304', 'hex')); // true
 * // <OP_RETURN> <OP_PUSHDATA1> <size: 0x0f> <data: 746573742d636f6d6d69746d656e74>
 * isOpReturnScriptPubkey(Buffer.from('6a4c0f746573742d636f6d6d69746d656e74', 'hex')); // true
 * // <OP_RETURN> <OP_PUSHDATA1>
 * isOpReturnScriptPubkey(Buffer.from('6a4c', 'hex')); // false
 * // <OP_RETURN> <size: 0x01>
 * isOpReturnScriptPubkey(Buffer.from('6a01', 'hex')); // false
 * // <OP_DUP> ... (not an OP_RETURN script)
 * isOpReturnScriptPubkey(Buffer.from('76a914a802fc56c704ce87c42d7c92eb75e7896bdc41e788ac', 'hex')); // false
 */
export function isOpReturnScriptPubkey(script: Buffer): boolean {
  const scripts = bitcoin.script.decompile(script);
  if (!scripts || scripts.length !== 2) {
    return false;
  }

  const [op, data] = scripts!;
  // OP_RETURN opcode is 0x6a in hex or 106 in integer
  if (op !== bitcoin.opcodes.OP_RETURN) {
    return false;
  }
  // Standard OP_RETURN data size is up to 80 bytes
  if (!(data instanceof Buffer) || data.byteLength < 1 || data.byteLength > 80) {
    return false;
  }

  // No false condition matched, it's an OP_RETURN script
  return true;
}
