import { expect } from 'vitest';
import { bitcoin, FEE_RATE } from '../../src';

/**
 * Estimate a network fee of a PSBT.
 */
export function calculatePsbtFee(psbt: bitcoin.Psbt, feeRate?: number) {
  if (!feeRate) {
    feeRate = FEE_RATE;
  }

  const tx = psbt.extractTransaction(false);
  const virtualSize = tx.virtualSize();
  return Math.ceil(virtualSize * feeRate);
}

/**
 * Expect the paid fee of the PSBT to be in ±1 range of the estimated fee.
 */
export function expectPsbtFeeInRange(psbt: bitcoin.Psbt, feeRate?: number) {
  const estimated = calculatePsbtFee(psbt, feeRate);
  const paid = psbt.getFee();

  expect([0, 1].includes(paid - estimated)).eq(
    true,
    `paid fee should be ${estimated}±1 satoshi, but paid ${paid} satoshi`,
  );
}
