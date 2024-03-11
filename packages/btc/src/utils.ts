import { bitcoin, ecc, ECPair } from './bitcoin';

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
 * Check if target string is a valid domain.
 * @exmaple
 * - Valid: isDomain('google.com')
 * - Invalid: isDomain('https://google.com')
 */
export function isDomain(domain: string): boolean {
  const regex = /^(?:[-A-Za-z0-9]+\.)+[A-Za-z]{2,}$/;
  return regex.test(domain);
}

/**
 * Remove '0x' prefix from a hex string.
 */
export function removeHexPrefix(hex: string): string {
  return hex.startsWith('0x') ? hex.slice(2) : hex;
}
