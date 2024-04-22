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
  it('Get UTXO[] via collectSatoshi()', async () => {
    const address = 'tb1qnxdtut9vpycmpnjpp77rmx33mfxsr86dl3ce6a';
    const nonRgbppSatoshi = 2546;
    const totalSatoshi = 3092;
    const nonRgbppUtxo = 2;
    const totalUtxo = 3;

    const c1 = await source.collectSatoshi({
      address,
      targetAmount: totalSatoshi,
      onlyNonRgbppUtxos: false,
    });
    expect(c1.utxos).toHaveLength(totalUtxo);
    expect(c1.satoshi).toEqual(totalSatoshi);

    const c2 = await source.collectSatoshi({
      address,
      targetAmount: nonRgbppSatoshi,
      onlyNonRgbppUtxos: true,
    });
    expect(c2.utxos).toHaveLength(nonRgbppUtxo);
    expect(c2.satoshi).toEqual(nonRgbppSatoshi);

    await expect(() =>
      source.collectSatoshi({
        address,
        targetAmount: totalSatoshi,
        onlyNonRgbppUtxos: true,
      }),
    ).rejects.toThrowError();
  });
});
