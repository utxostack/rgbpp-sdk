import { describe, it, expect } from 'vitest';
import { ensureSafeJson } from '../src/utils/json';
import { toSnakeCase, toCamelCase } from '../src/utils/case';

describe('Utils', () => {
  it('toSnakeCase()', () => {
    expect(
      toSnakeCase({
        misterA: 1,
        MisterB: 2,
        mister_C: 3,
        '0x06c1c265d475e69bac3b42f8deca5ac982efabfa640eff96a0f5d15345583e6e': 4,
      }),
    ).toStrictEqual({
      mister_a: 1,
      mister_b: 2,
      mister_c: 3,
      '0x06c1c265d475e69bac3b42f8deca5ac982efabfa640eff96a0f5d15345583e6e': 4,
    });
    expect(
      toSnakeCase([
        {
          misterA: 1,
          MisterB: 2,
          mister_C: 3,
          '0x06c1c265d475e69bac3b42f8deca5ac982efabfa640eff96a0f5d15345583e6e': 4,
        },
      ]),
    ).toStrictEqual([
      {
        mister_a: 1,
        mister_b: 2,
        mister_c: 3,
        '0x06c1c265d475e69bac3b42f8deca5ac982efabfa640eff96a0f5d15345583e6e': 4,
      },
    ]);
  });
  it('toCamelCase()', () => {
    expect(
      toCamelCase({
        misterA: 1,
        mister_b: 2,
        MisterC: 3,
        '0x06c1c265d475e69bac3b42f8deca5ac982efabfa640eff96a0f5d15345583e6e': 4,
      }),
    ).toStrictEqual({
      misterA: 1,
      misterB: 2,
      misterC: 3,
      '0x06c1c265d475e69bac3b42f8deca5ac982efabfa640eff96a0f5d15345583e6e': 4,
    });
    expect(
      toCamelCase([
        {
          misterA: 1,
          mister_b: 2,
          MisterC: 3,
          '0x06c1c265d475e69bac3b42f8deca5ac982efabfa640eff96a0f5d15345583e6e': 4,
        },
      ]),
    ).toStrictEqual([
      {
        misterA: 1,
        misterB: 2,
        misterC: 3,
        '0x06c1c265d475e69bac3b42f8deca5ac982efabfa640eff96a0f5d15345583e6e': 4,
      },
    ]);
  });
  it('ensureSafeJson()', () => {
    expect(
      ensureSafeJson({
        number: 1,
        boolean: true,
        string: 'string',
        object: {
          number: 1,
          bigint1: BigInt('0x64'),
        },
        array: [
          {
            number: 1,
            bigint1: BigInt('0x64'),
          },
        ],
        bigint1: BigInt(100),
        bigint2: BigInt('100'),
        bigint3: BigInt('0x64'),
      }),
    ).toStrictEqual({
      number: 1,
      boolean: true,
      string: 'string',
      object: {
        number: 1,
        bigint1: '0x64',
      },
      array: [
        {
          number: 1,
          bigint1: '0x64',
        },
      ],
      bigint1: '0x64',
      bigint2: '0x64',
      bigint3: '0x64',
    });
  });
});
