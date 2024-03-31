import { describe, expect, it } from 'vitest';
import { source } from './shared/env';
import { ErrorCodes } from '../src';

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
  it('Get OP_RETURN output via getOutput()', async () => {
    const output = await source.getOutput('70b250e2a3cc7a33b47f7a4e94e41e1ee2501ce73b393d824db1dd4c872c5348', 0);

    expect(output).toBeDefined();
    expect(output.txid).toBeTypeOf('string');
    expect(output.vout).toBeTypeOf('number');
    expect(output.value).toBeTypeOf('number');
    expect(output.scriptPk).toBeTypeOf('string');
    expect(output).not.toHaveProperty('address');
    expect(output).not.toHaveProperty('addressType');
  });
  it('Get OP_RETURN output via getUtxo()', async () => {
    await expect(() =>
      source.getUtxo('70b250e2a3cc7a33b47f7a4e94e41e1ee2501ce73b393d824db1dd4c872c5348', 0),
    ).rejects.toHaveProperty('code', ErrorCodes.UNSPENDABLE_OUTPUT);
  });
});
