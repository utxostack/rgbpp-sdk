import { describe, it, expect } from 'vitest';
import { buildRgbppUnlockWitness } from './ckb-builder';

describe('RGBPP schemas', () => {
  it('buildRgbppUnlockWitness', async () => {
    const btcTx =
      '0x000000000156e156abc593f2d07b496c52f767c48e85c9a0e7f2707acee20cb4feca8fb3a5000000002094ee8a1d82d77738655e09affc6903021a97a143afcc5cd02afb052150c39537000000000200000000000001f4226a201bd6b07a2e10e6d0e8c80ef629ed919795d80860b7bf48a7fe54c1d32291f4d800000000000001f4202f1275473ae8a84d5ba4ec48d4a9cf9aeee4a62d711c620a7d63ad87e9d300ac00000000';
    const txProof = '0x';
    const inputsLen = 1;
    const outputsLen = 2;
    const rgbppUnlock = buildRgbppUnlockWitness(btcTx, txProof, inputsLen, outputsLen);
    expect(
      '0xc7000000140000001600000018000000c300000000000102a7000000000000000156e156abc593f2d07b496c52f767c48e85c9a0e7f2707acee20cb4feca8fb3a5000000002094ee8a1d82d77738655e09affc6903021a97a143afcc5cd02afb052150c39537000000000200000000000001f4226a201bd6b07a2e10e6d0e8c80ef629ed919795d80860b7bf48a7fe54c1d32291f4d800000000000001f4202f1275473ae8a84d5ba4ec48d4a9cf9aeee4a62d711c620a7d63ad87e9d300ac0000000000000000',
    ).toBe(rgbppUnlock);
  });
});
