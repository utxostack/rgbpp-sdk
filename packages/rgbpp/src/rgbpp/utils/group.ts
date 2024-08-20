export function groupNumbersBySum(
  numbers: number[],
  target: number,
): {
  indices: number[][];
  numbers: number[][];
} {
  const groups: number[][] = [];
  const groupIds = new Set<string>();
  const usedIndices = new Set<number>();

  function backtrack(group: number[], sum: number, start: number): boolean {
    if (sum === target) {
      return true;
    }
    if (sum > target) {
      return false;
    }
    for (let i = start; i < numbers.length; i++) {
      if (usedIndices.has(i)) {
        continue;
      }
      usedIndices.add(i);
      group.push(i);
      if (backtrack(group, sum + numbers[i]!, i + 1)) {
        addGroup(group);
        return true;
      }
      usedIndices.delete(i);
      group.pop();
    }
    if (group.length > 0 && sum < target) {
      addGroup(group);
      return true;
    }
    return false;
  }

  function addGroup(group: number[]) {
    const sortedGroup = [...group].sort((a, b) => a - b);
    const groupId = sortedGroup.join(',');
    if (!groupIds.has(groupId)) {
      groups.push([...group]);
      groupIds.add(groupId);
    }
  }

  numbers.forEach((_, index) => {
    if (!usedIndices.has(index)) {
      backtrack([], 0, index);
    }
  });

  return {
    indices: groups,
    numbers: groups.map((group) => {
      return group.map((index) => numbers[index]!);
    }),
  };
}

export function mapGroupsByIndices<T>(indices: number[][], getter: (index: number) => T): T[][] {
  return indices.map((group) => {
    return group.map((index) => getter(index));
  });
}
