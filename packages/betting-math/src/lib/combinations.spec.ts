import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { generateCombinations } from './combinations';

function binomial(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let result = 1;
  for (let i = 0; i < k; i++) {
    result = (result * (n - i)) / (i + 1);
  }
  return Math.round(result);
}

describe('generateCombinations', () => {
  it('produces the known combinations for a small example', () => {
    expect(generateCombinations(['a', 'b', 'c'], 2)).toEqual([
      ['a', 'b'],
      ['a', 'c'],
      ['b', 'c'],
    ]);
  });

  it('k = 0 returns a single empty combination', () => {
    expect(generateCombinations(['a', 'b'], 0)).toEqual([[]]);
  });

  it('k = items.length returns one combination containing everything', () => {
    expect(generateCombinations(['a', 'b', 'c'], 3)).toEqual([['a', 'b', 'c']]);
  });

  it('k > items.length or k < 0 returns no combinations', () => {
    expect(generateCombinations(['a', 'b'], 3)).toEqual([]);
    expect(generateCombinations(['a', 'b'], -1)).toEqual([]);
  });

  it('empty input with k = 0 returns one empty combination', () => {
    expect(generateCombinations([], 0)).toEqual([[]]);
  });

  it('produces exactly C(n, k) combinations, each of length k, with no duplicates', () => {
    // Uses unique items so "no duplicate combinations" is well-defined by
    // value; with duplicate-valued items, two structurally distinct
    // combinations (different source indices) can legitimately serialize to
    // the same value — that's correct, not a bug.
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.integer(), { minLength: 0, maxLength: 10 }),
        fc.integer({ min: 0, max: 10 }),
        (items, k) => {
          const combos = generateCombinations(items, k);
          expect(combos).toHaveLength(binomial(items.length, k));
          for (const combo of combos) {
            expect(combo).toHaveLength(k);
          }
          const serialized = combos.map((c) => JSON.stringify(c));
          expect(new Set(serialized).size).toBe(serialized.length);
        },
      ),
    );
  });

  it('every combination is a subset of the original items, preserving relative order', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.integer(), { minLength: 1, maxLength: 8 }),
        fc.integer({ min: 1, max: 8 }),
        (items, k) => {
          const combos = generateCombinations(items, k);
          for (const combo of combos) {
            const indices = combo.map((v) => items.indexOf(v));
            expect(indices).toEqual([...indices].sort((a, b) => a - b));
          }
        },
      ),
    );
  });
});
