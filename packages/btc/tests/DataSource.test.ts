import { describe, expect, it } from 'vitest';
import { source } from './shared/env.js';
import { ErrorCodes } from '../src';

describe('DataSource', { retry: 3 }, () => {
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
  describe('collectSatoshi()', () => {
    const address = 'tb1qn5kgn70tpwsw4nuxrch8l7qa9nqn4fahxgzjg6';
    const totalSatoshi = 546 + 2000 + 1500;
    const nonRgbppSatoshi = 1500;
    const nonRgbppUtxo = 1;
    const totalUtxo = 3;

    it('onlyNonRgbppUtxos = false', async () => {
      const c = await source.collectSatoshi({
        address,
        targetAmount: totalSatoshi,
        onlyNonRgbppUtxos: false,
      });
      expect(c.utxos).toHaveLength(totalUtxo);
      expect(c.satoshi).toEqual(totalSatoshi);
    });
    it('onlyNonRgbppUtxos = true', async () => {
      const c = await source.collectSatoshi({
        address,
        targetAmount: nonRgbppSatoshi,
        onlyNonRgbppUtxos: true,
      });
      expect(c.utxos).toHaveLength(nonRgbppUtxo);
      expect(c.satoshi).toEqual(nonRgbppSatoshi);
    });
    it('Try onlyNonRgbppUtxos = true and targetAmount = totalSatoshi', async () => {
      await expect(() =>
        source.collectSatoshi({
          address,
          targetAmount: totalSatoshi,
          onlyNonRgbppUtxos: true,
        }),
      ).rejects.toThrowError();
    });
  });
});
