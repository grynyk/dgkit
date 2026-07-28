import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { fraction, fractionToNumber } from './fraction';
import {
  applyRule4Deduction,
  lookupRule4Deduction,
  type Rule4Band,
} from './rule4';

describe('applyRule4Deduction', () => {
  it('a 25p deduction cuts a quarter of the profit', () => {
    // odds 3.0 -> profit 2.0 -> keep 75% -> profit 1.5 -> odds 2.5
    expect(applyRule4Deduction(fraction(3, 1), 25)).toEqual(fraction(5, 2));
  });

  it('0p deduction is a no-op', () => {
    expect(applyRule4Deduction(fraction(7, 2), 0)).toEqual(fraction(7, 2));
  });

  it('100p deduction removes all profit — odds become exactly 1 (stake back only)', () => {
    expect(applyRule4Deduction(fraction(7, 2), 100)).toEqual(fraction(1, 1));
  });

  it('rejects a deduction outside [0, 100]', () => {
    expect(() => applyRule4Deduction(fraction(2, 1), -1)).toThrow(RangeError);
    expect(() => applyRule4Deduction(fraction(2, 1), 101)).toThrow(RangeError);
  });

  it('a larger deduction never increases the resulting odds (monotonic)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 100 }),
        fc.integer({ min: 0, max: 99 }),
        (num, deduction) => {
          const odds = fraction(num, 1);
          const lower = fractionToNumber(
            applyRule4Deduction(odds, deduction + 1),
          );
          const higher = fractionToNumber(applyRule4Deduction(odds, deduction));
          expect(lower).toBeLessThanOrEqual(higher);
        },
      ),
    );
  });

  it('applied odds are always >= 1 for any deduction in range', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10_000 }),
        fc.integer({ min: 0, max: 100 }),
        (num, deduction) => {
          expect(
            fractionToNumber(applyRule4Deduction(fraction(num, 1), deduction)),
          ).toBeGreaterThanOrEqual(1);
        },
      ),
    );
  });
});

const SAMPLE_TABLE: readonly Rule4Band[] = [
  { maxDecimalOdds: 1.25, deductionPence: 75 },
  { maxDecimalOdds: 1.5, deductionPence: 50 },
  { maxDecimalOdds: 2.0, deductionPence: 25 },
  { maxDecimalOdds: 3.0, deductionPence: 10 },
];

describe('lookupRule4Deduction', () => {
  it('finds the first band whose maxDecimalOdds covers the withdrawn price', () => {
    expect(lookupRule4Deduction(fraction(1, 1), SAMPLE_TABLE)).toBe(75); // 1.0
    expect(lookupRule4Deduction(fraction(3, 2), SAMPLE_TABLE)).toBe(50); // 1.5, exact band edge
    expect(lookupRule4Deduction(fraction(9, 5), SAMPLE_TABLE)).toBe(25); // 1.8
  });

  it('returns 0 beyond the last band in the table', () => {
    expect(lookupRule4Deduction(fraction(10, 1), SAMPLE_TABLE)).toBe(0);
  });

  it('throws on an empty table', () => {
    expect(() => lookupRule4Deduction(fraction(2, 1), [])).toThrow(RangeError);
  });

  it('always returns a value in [0, 100] for any sorted table and price', () => {
    const sortedTableArb = fc
      .array(
        fc.record({
          maxDecimalOdds: fc.double({ min: 1.01, max: 1000, noNaN: true }),
          deductionPence: fc.integer({ min: 0, max: 100 }),
        }),
        { minLength: 1, maxLength: 20 },
      )
      .map((bands) =>
        [...bands].sort((a, b) => a.maxDecimalOdds - b.maxDecimalOdds),
      );

    fc.assert(
      fc.property(
        sortedTableArb,
        fc.integer({ min: 2, max: 100_000 }),
        (table, num) => {
          const result = lookupRule4Deduction(fraction(num, 1), table);
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBeLessThanOrEqual(100);
        },
      ),
    );
  });
});
