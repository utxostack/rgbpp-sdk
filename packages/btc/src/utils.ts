import { bitcoin, ecc, ECPair } from './bitcoin';
import { bytes } from '@ckb-lumos/codec';

const textEncoder = new TextEncoder();

export function toXOnly(pubKey: Buffer): Buffer {
  return pubKey.length === 32 ? pubKey : pubKey.subarray(1, 33);
}

function tapTweakHash(publicKey: Buffer, hash: Buffer | undefined): Buffer {
  return bitcoin.crypto.taggedHash('TapTweak', Buffer.concat(hash ? [publicKey, hash] : [publicKey]));
}

export function tweakSigner<T extends bitcoin.Signer>(
  signer: T,
  options?: {
    network?: bitcoin.Network;
    tweakHash?: Buffer;
  },
): bitcoin.Signer {
  let privateKey: Uint8Array | undefined = (signer as any).privateKey;
  if (!privateKey) {
    throw new Error('Private key is required for tweaking signer!');
  }
  if (signer.publicKey[0] === 3) {
    privateKey = ecc.privateNegate(privateKey);
  }

  const tweakedPrivateKey = ecc.privateAdd(privateKey, tapTweakHash(toXOnly(signer.publicKey), options?.tweakHash));
  if (!tweakedPrivateKey) {
    throw new Error('Invalid tweaked private key!');
  }

  return ECPair.fromPrivateKey(Buffer.from(tweakedPrivateKey), {
    network: options?.network,
  });
}

/**
 * Remove '0x' prefix from a hex string.
 * @example
 * remove0x('0x1234') // => '1234'
 * remove0x('1234') // => '1234'
 */
export function remove0x(hex: string): string {
  return hex.startsWith('0x') ? hex.slice(2) : hex;
}

/**
 * Convert UTF-8 raw text to buffer (binary bytes).
 * @example
 * utf8ToBuffer('0x1234') // => Uint8Array(2) [ 18, 52 ]
 * utf8ToBuffer('1234') // => Uint8Array(4) [ 49, 50, 51, 52 ]
 * utf8ToBuffer('hello') // => Uint8Array(5) [ 104, 101, 108, 108, 111 ]
 */
export function utf8ToBuffer(text: string): Uint8Array {
  let result = text.trim();
  if (result.startsWith('0x')) {
    return bytes.bytify(result);
  }

  return textEncoder.encode(result);
}

/**
 * Convert a bitcoin.Transaction to hex string.
 * Note if using for RGBPP proof, shouldn't set the "withWitness" param to "true".
 */
export function transactionToHex(tx: bitcoin.Transaction, withWitness?: boolean): string {
  const buffer: Buffer = tx['__toBuffer'](void 0, void 0, withWitness ?? false);
  return buffer.toString('hex');
}
