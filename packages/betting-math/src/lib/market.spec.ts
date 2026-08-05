import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  calculateFairOdds,
  calculateFairProbabilities,
  calculateOverround,
  impliedProbability,
} from './market';
import {
  addFractions,
  divideFractions,
  fraction,
  ONE,
  subtractFractions,
  ZERO,
} from './fraction';

describe('impliedProbability', () => {
  it('is the reciprocal of decimal odds', () => {
    expect(impliedProbability(fraction(2, 1))).toEqual(fraction(1, 2));
    expect(impliedProbability(fraction(4, 1))).toEqual(fraction(1, 4));
  });

  it('rejects odds that are not greater than 1', () => {
    expect(() => impliedProbability(fraction(1, 1))).toThrow(RangeError);
    expect(() => impliedProbability(fraction(1, 2))).toThrow(RangeError);
  });
});

describe('calculateOverround', () => {
  it('is 0 for a perfectly fair two-way market', () => {
    expect(calculateOverround([fraction(2, 1), fraction(2, 1)])).toEqual(ZERO);
  });

  it('matches the known margin of a standard -110/-110 market', () => {
    // 1.91 decimal ~ American -110. 1/1.91 + 1/1.91 = 200/191 -> overround 9/191.
    expect(
      calculateOverround([fraction(191, 100), fraction(191, 100)]),
    ).toEqual(fraction(9, 191));
  });

  it('sums correctly across an asymmetric three-way market', () => {
    // Odds 1.5 / 3 / 6 -> implied probabilities 2/3, 1/3, 1/6 -> sum 7/6.
    expect(
      calculateOverround([fraction(3, 2), fraction(3, 1), fraction(6, 1)]),
    ).toEqual(fraction(1, 6));
  });

  it('throws on an empty market', () => {
    expect(() => calculateOverround([])).toThrow(RangeError);
  });

  it('throws if any odds is not greater than 1', () => {
    expect(() => calculateOverround([fraction(2, 1), fraction(1, 1)])).toThrow(
      RangeError,
    );
  });
});

describe('calculateFairProbabilities', () => {
  it('devigs a -110/-110 market to exactly 50/50', () => {
    expect(
      calculateFairProbabilities([fraction(191, 100), fraction(191, 100)]),
    ).toEqual([fraction(1, 2), fraction(1, 2)]);
  });

  it('devigs an asymmetric three-way market', () => {
    expect(
      calculateFairProbabilities([
        fraction(3, 2),
        fraction(3, 1),
        fraction(6, 1),
      ]),
    ).toEqual([fraction(4, 7), fraction(2, 7), fraction(1, 7)]);
  });

  it('always sums to exactly 1, for any valid market', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc
            .tuple(
              fc.integer({ min: 1, max: 100_000 }),
              fc.integer({ min: 1, max: 1000 }),
            )
            // odds = 1 + a/b, guaranteed > 1 regardless of a and b.
            .map(([a, b]) => fraction(a + b, b)),
          { minLength: 1, maxLength: 10 },
        ),
        (marketOdds) => {
          const fairProbabilities = calculateFairProbabilities(marketOdds);
          const sum = fairProbabilities.reduce(
            (acc, p) => addFractions(acc, p),
            ZERO,
          );
          expect(sum).toEqual(ONE);
        },
      ),
    );
  });
});

describe('calculateFairOdds', () => {
  it('devigs a -110/-110 market to exactly even money', () => {
    expect(calculateFairOdds([fraction(191, 100), fraction(191, 100)])).toEqual(
      [fraction(2, 1), fraction(2, 1)],
    );
  });

  it('devigs an asymmetric three-way market', () => {
    expect(
      calculateFairOdds([fraction(3, 2), fraction(3, 1), fraction(6, 1)]),
    ).toEqual([fraction(7, 4), fraction(7, 2), fraction(7, 1)]);
  });

  it('leaves an already-fair market unchanged', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 999 }), (n) => {
        // Build a two-way market whose implied probabilities already sum to
        // 1 exactly: p + (1 - p) = 1, and odds = 1/probability by
        // construction, so the market carries no margin to remove.
        const p = fraction(n, 1000);
        const q = subtractFractions(ONE, p);
        const marketOdds = [divideFractions(ONE, p), divideFractions(ONE, q)];

        expect(calculateOverround(marketOdds)).toEqual(ZERO);
        expect(calculateFairOdds(marketOdds)).toEqual(marketOdds);
      }),
    );
  });
});
