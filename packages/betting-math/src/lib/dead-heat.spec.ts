import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { fraction, fractionToNumber } from './fraction';
import { reduceDeadHeatOdds } from './dead-heat';

describe('reduceDeadHeatOdds', () => {
  it('two runners dead heat: profit halves', () => {
    expect(reduceDeadHeatOdds(fraction(3, 1), 2)).toEqual(fraction(2, 1));
  });

  it('three runners dead heat: profit thirds', () => {
    expect(reduceDeadHeatOdds(fraction(4, 1), 3)).toEqual(fraction(2, 1));
  });

  it('tiedCount = 1 is rejected — that is not a dead heat', () => {
    expect(() => reduceDeadHeatOdds(fraction(3, 1), 1)).toThrow(RangeError);
  });

  it('rejects a non-integer tiedCount', () => {
    expect(() => reduceDeadHeatOdds(fraction(3, 1), 2.5)).toThrow(RangeError);
  });

  it('reduced odds always exceed 1 for odds > 1 and any valid tiedCount', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10_000 }),
        fc.integer({ min: 2, max: 100 }),
        (num, tiedCount) => {
          const odds = fraction(num, 1);
          const reduced = reduceDeadHeatOdds(odds, tiedCount);
          expect(fractionToNumber(reduced)).toBeGreaterThan(1);
        },
      ),
    );
  });

  it('a larger tiedCount always reduces the odds further (monotonic)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 1000 }),
        fc.integer({ min: 2, max: 20 }),
        (num, tiedCount) => {
          const odds = fraction(num, 1);
          const reducedAt = (n: number) =>
            fractionToNumber(reduceDeadHeatOdds(odds, n));
          expect(reducedAt(tiedCount + 1)).toBeLessThan(reducedAt(tiedCount));
        },
      ),
    );
  });

  it('reducing by a then b is the same as reducing once by a * b (the transform is linear in profit)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 1000 }),
        fc.integer({ min: 2, max: 20 }),
        fc.integer({ min: 2, max: 20 }),
        (num, a, b) => {
          const odds = fraction(num, 1);
          const sequential = reduceDeadHeatOdds(reduceDeadHeatOdds(odds, a), b);
          const combined = reduceDeadHeatOdds(odds, a * b);
          expect(sequential).toEqual(combined);
        },
      ),
    );
  });
});
