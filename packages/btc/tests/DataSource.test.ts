import { describe, expect, it } from 'vitest';
import { source } from './shared/env';

describe('DataSource', () => {
  it('Get recommended fee rates', async () => {
    const fees = await source.getRecommendedFeeRates();

    expect(fees).toBeDefined();
    expect(fees.fastestFee).toBeTypeOf('number');
    expect(fees.halfHourFee).toBeTypeOf('number');
    expect(fees.hourFee).toBeTypeOf('number');
    expect(fees.minimumFee).toBeTypeOf('number');

    expect(fees.fastestFee).toBeGreaterThanOrEqual(fees.halfHourFee);
    expect(fees.halfHourFee).toBeGreaterThanOrEqual(fees.hourFee);
    expect(fees.hourFee).toBeGreaterThanOrEqual(fees.minimumFee);
  });
  it('Get average fee rate', async () => {
    const [feeRates, averageFeeRate] = await Promise.all([source.getRecommendedFeeRates(), source.getAverageFeeRate()]);

    expect(averageFeeRate).toBeTypeOf('number');
    expect(feeRates.halfHourFee).toBeTypeOf('number');
    expect(averageFeeRate).toEqual(feeRates.halfHourFee);
  });
});
