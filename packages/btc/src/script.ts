import { isP2TR, isP2WPKH } from './bitcoin.js';

export function isP2wpkhScript(script: Buffer | string): boolean {
  const buffer = typeof script === 'string' ? Buffer.from(script, 'hex') : script;
  return isP2WPKH(buffer);
}

export function isP2trScript(script: Buffer | string): boolean {
  const buffer = typeof script === 'string' ? Buffer.from(script, 'hex') : script;
  return isP2TR(buffer);
}
