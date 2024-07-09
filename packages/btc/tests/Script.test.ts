import { isP2trScript, isP2wpkhScript } from '../src';
import { describe, expect, it } from 'vitest';
import { accounts } from './shared/env.js';

describe('Script', () => {
  const p2wpkh = accounts.charlie.p2wpkh.scriptPubkey;
  const p2tr = accounts.charlie.p2tr.scriptPubkey;

  it('isP2trScript()', () => {
    expect(isP2trScript(p2tr)).toBe(true);
    expect(isP2trScript(p2wpkh)).toBe(false);
  });
  it('isP2wpkhScript()', () => {
    expect(isP2wpkhScript(p2wpkh)).toBe(true);
    expect(isP2wpkhScript(p2tr)).toBe(false);
  });
});
