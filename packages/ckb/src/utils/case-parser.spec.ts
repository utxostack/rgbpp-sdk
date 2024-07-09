import { describe, it, expect } from 'vitest';
import { toCamelcase } from './case-parser.js';

interface TestType {
  firstField: number;
  secondField: string[];
  thirdField: { subFirstField: boolean; subSecondField: 'abc' };
}

describe('case parser', () => {
  it('toCamelcase', () => {
    const result = toCamelcase<TestType>({
      first_field: 1,
      second_field: ['0', '1'],
      third_field: { sub_first_field: false, sub_second_field: 'abc' },
    });
    expect(1).toBe(result?.firstField);
    expect('0').toBe(result?.secondField[0]);
    expect('abc').toBe(result?.thirdField.subSecondField);

    const list = toCamelcase<TestType[]>([
      {
        first_field: 1,
        second_field: ['0', '1'],
        third_field: { sub_first_field: false, sub_second_field: 'abc' },
      },
    ]);
    expect(1).toBe(list![0].firstField);
    expect('0').toBe(list![0].secondField[0]);
    expect('abc').toBe(list![0].thirdField.subSecondField);
  });
});
