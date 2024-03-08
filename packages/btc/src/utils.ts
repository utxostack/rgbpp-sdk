export function toXOnly(pubKey: Buffer): Buffer {
  return pubKey.length === 32 ? pubKey : pubKey.slice(1, 33);
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
