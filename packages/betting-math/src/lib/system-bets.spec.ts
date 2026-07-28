import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { countFullCoverLines, getFullCoverLines } from './system-bets';

describe('getFullCoverLines', () => {
  it('a Trixie (3 legs, folds [2,3]): 3 doubles + 1 treble', () => {
    expect(getFullCoverLines(3, [2, 3])).toEqual([
      [0, 1],
      [0, 2],
      [1, 2],
      [0, 1, 2],
    ]);
  });

  it('a Patent (3 legs, folds [1,2,3]): 3 singles + 3 doubles + 1 treble', () => {
    expect(getFullCoverLines(3, [1, 2, 3])).toEqual([
      [0],
      [1],
      [2],
      [0, 1],
      [0, 2],
      [1, 2],
      [0, 1, 2],
    ]);
  });

  it('deduplicates repeated fold values', () => {
    expect(getFullCoverLines(3, [2, 2, 3])).toEqual(
      getFullCoverLines(3, [2, 3]),
    );
  });

  it('sorts folds ascending regardless of input order', () => {
    expect(getFullCoverLines(3, [3, 1, 2])).toEqual(
      getFullCoverLines(3, [1, 2, 3]),
    );
  });

  it('throws on a non-positive-integer legCount', () => {
    expect(() => getFullCoverLines(0, [1])).toThrow(RangeError);
    expect(() => getFullCoverLines(2.5, [1])).toThrow(RangeError);
  });

  it('throws when a fold is out of [1, legCount]', () => {
    expect(() => getFullCoverLines(3, [0])).toThrow(RangeError);
    expect(() => getFullCoverLines(3, [4])).toThrow(RangeError);
  });
});

describe('countFullCoverLines', () => {
  // Standard published line counts for these well-known system bet names —
  // this package ships no "Trixie"/"Yankee" constants (see README), but the
  // underlying combinatorics are exactly what those names refer to.
  it.each([
    { name: 'Trixie', legCount: 3, folds: [2, 3], lines: 4 },
    { name: 'Patent', legCount: 3, folds: [1, 2, 3], lines: 7 },
    { name: 'Yankee', legCount: 4, folds: [2, 3, 4], lines: 11 },
    { name: 'Lucky 15', legCount: 4, folds: [1, 2, 3, 4], lines: 15 },
    { name: 'Lucky 31', legCount: 5, folds: [1, 2, 3, 4, 5], lines: 31 },
    { name: 'Heinz', legCount: 6, folds: [2, 3, 4, 5, 6], lines: 57 },
    { name: 'Lucky 63', legCount: 6, folds: [1, 2, 3, 4, 5, 6], lines: 63 },
    { name: 'Goliath', legCount: 8, folds: [2, 3, 4, 5, 6, 7, 8], lines: 247 },
  ])(
    '$name ($legCount legs) has $lines lines',
    ({ legCount, folds, lines }) => {
      expect(countFullCoverLines(legCount, folds)).toBe(lines);
      expect(getFullCoverLines(legCount, folds)).toHaveLength(lines);
    },
  );

  it('matches the actual number of lines generateFullCoverLines produces, for arbitrary inputs', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 8 }),
        fc.uniqueArray(fc.integer({ min: 1, max: 8 }), {
          minLength: 1,
          maxLength: 8,
        }),
        (legCount, rawFolds) => {
          const folds = rawFolds.filter((f) => f <= legCount);
          fc.pre(folds.length > 0);
          expect(countFullCoverLines(legCount, folds)).toBe(
            getFullCoverLines(legCount, folds).length,
          );
        },
      ),
    );
  });

  it('throws on a non-positive-integer legCount', () => {
    expect(() => countFullCoverLines(0, [1])).toThrow(RangeError);
  });

  it('throws when a fold is out of [1, legCount]', () => {
    expect(() => countFullCoverLines(3, [4])).toThrow(RangeError);
  });
});
