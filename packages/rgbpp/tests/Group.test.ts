import { describe, it, expect } from 'vitest';
import { groupNumbersBySum } from '../src/rgbpp/utils/group';

describe('Group', () => {
  describe('groupNumbersBySum()', () => {
    it('[9]', () => {
      const target = 10;
      const numbers = [9];
      const groups = groupNumbersBySum(numbers, target);
      expect(groups.indices).toEqual([[0]]);
      expect(groups.numbers).toEqual([[9]]);
    });
    it('[9, 1]', () => {
      const target = 10;
      const numbers = [9, 1];
      const groups = groupNumbersBySum(numbers, target);
      expect(groups.indices).toEqual([[0, 1]]);
      expect(groups.numbers).toEqual([[9, 1]]);
    });
    it('[10, 1]', () => {
      const target = 10;
      const numbers = [10, 1];
      const groups = groupNumbersBySum(numbers, target);
      expect(groups.indices).toEqual([[0], [1]]);
      expect(groups.numbers).toEqual([[10], [1]]);
    });
    it('[5, 5, 5]', () => {
      const target = 10;
      const numbers = [5, 5, 5];
      const groups = groupNumbersBySum(numbers, target);
      expect(groups.indices).toEqual([[0, 1], [2]]);
      expect(groups.numbers).toEqual([[5, 5], [5]]);
    });
    it('[1, 1, 1, 1, 1]', () => {
      const target = 10;
      const numbers = [1, 1, 1, 1, 1];
      const groups = groupNumbersBySum(numbers, target);
      expect(groups.indices).toEqual([[0, 1, 2, 3, 4]]);
      expect(groups.numbers).toEqual([[1, 1, 1, 1, 1]]);
    });
    it('[5, 10, 5]', () => {
      const target = 10;
      const numbers = [5, 10, 5];
      const groups = groupNumbersBySum(numbers, target);
      expect(groups.indices).toEqual([[0, 2], [1]]);
      expect(groups.numbers).toEqual([[5, 5], [10]]);
    });
    it('[10, 5, 10, 5]', () => {
      const target = 10;
      const numbers = [10, 5, 10, 5];
      const groups = groupNumbersBySum(numbers, target);
      expect(groups.indices).toEqual([[0], [1, 3], [2]]);
      expect(groups.numbers).toEqual([[10], [5, 5], [10]]);
    });
    it('[11]', () => {
      const target = 10;
      const numbers = [11];
      const groups = groupNumbersBySum(numbers, target);
      expect(groups.indices).toEqual([]);
      expect(groups.numbers).toEqual([]);
    });
    it('[]', () => {
      const target = 10;
      const numbers: number[] = [];
      const groups = groupNumbersBySum(numbers, target);
      expect(groups.indices).toEqual([]);
      expect(groups.numbers).toEqual([]);
    });
  });
});
