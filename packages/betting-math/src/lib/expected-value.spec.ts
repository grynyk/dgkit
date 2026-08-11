import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { calculateEdge, calculateExpectedValue } from './expected-value';
import {
  compareFractions,
  fraction,
  multiplyFractions,
  ONE,
  ZERO,
  type Fraction,
} from './fraction';
import { impliedProbability } from './market';

describe('calculateEdge', () => {
  it('is positive when trueProbability beats the implied probability', () => {
    expect(calculateEdge(fraction(3, 5), fraction(2, 1))).toEqual(
      fraction(1, 5),
    );
  });

  it('is negative when trueProbability is worse than the implied probability', () => {
    expect(calculateEdge(fraction(2, 5), fraction(2, 1))).toEqual(
      fraction(-1, 5),
    );
  });

  it('is exactly zero at a perfectly fair price', () => {
    expect(calculateEdge(fraction(1, 2), fraction(2, 1))).toEqual(ZERO);
  });

  it('accepts trueProbability at the upper boundary of 1', () => {
    expect(calculateEdge(ONE, fraction(2, 1))).toEqual(ONE);
  });

  it('rejects a trueProbability of 0 or below', () => {
    expect(() => calculateEdge(ZERO, fraction(2, 1))).toThrow(RangeError);
    expect(() => calculateEdge(fraction(-1, 2), fraction(2, 1))).toThrow(
      RangeError,
    );
  });

  it('rejects a trueProbability above 1', () => {
    expect(() => calculateEdge(fraction(3, 2), fraction(2, 1))).toThrow(
      RangeError,
    );
  });

  it('rejects decimalOdds not greater than 1', () => {
    expect(() => calculateEdge(fraction(1, 2), ONE)).toThrow(RangeError);
    expect(() => calculateEdge(fraction(1, 2), fraction(1, 2))).toThrow(
      RangeError,
    );
  });
});

describe('calculateExpectedValue', () => {
  it('computes expectedValue, edge and impliedProbability together', () => {
    const result = calculateExpectedValue(
      fraction(3, 5),
      fraction(2, 1),
      fraction(100, 1),
    );

    expect(result).toEqual({
      stake: fraction(100, 1),
      expectedValue: fraction(20, 1),
      edge: fraction(1, 5),
      impliedProbability: fraction(1, 2),
    });
  });

  it('rejects a non-positive stake', () => {
    expect(() =>
      calculateExpectedValue(fraction(3, 5), fraction(2, 1), ZERO),
    ).toThrow(RangeError);
    expect(() =>
      calculateExpectedValue(fraction(3, 5), fraction(2, 1), fraction(-1, 1)),
    ).toThrow(RangeError);
  });

  it('rejects the same invalid probability/odds as calculateEdge', () => {
    expect(() =>
      calculateExpectedValue(ZERO, fraction(2, 1), fraction(100, 1)),
    ).toThrow(RangeError);
    expect(() =>
      calculateExpectedValue(fraction(1, 2), ONE, fraction(100, 1)),
    ).toThrow(RangeError);
  });

  /** Probability in (0, 1], generated from a bounded integer pair. */
  const probabilityArb: fc.Arbitrary<Fraction> = fc
    .tuple(
      fc.integer({ min: 1, max: 1_000 }),
      fc.integer({ min: 1, max: 1_000 }),
    )
    .map(([a, b]) => fraction(Math.min(a, b), Math.max(a, b)));

  /** Odds strictly greater than 1, generated from a bounded integer pair. */
  const oddsArb: fc.Arbitrary<Fraction> = fc
    .tuple(
      fc.integer({ min: 1, max: 100_000 }),
      fc.integer({ min: 1, max: 1_000 }),
    )
    .map(([a, b]) => fraction(a + b, b));

  const stakeArb = fc
    .integer({ min: 1, max: 1_000_000 })
    .map((n) => fraction(n, 1));

  it('is linear in stake', () => {
    fc.assert(
      fc.property(
        probabilityArb,
        oddsArb,
        stakeArb,
        fc.integer({ min: 1, max: 20 }),
        (probability, odds, stake, k) => {
          const base = calculateExpectedValue(probability, odds, stake);
          const scaled = calculateExpectedValue(
            probability,
            odds,
            multiplyFractions(stake, fraction(k, 1)),
          );
          expect(scaled.expectedValue).toEqual(
            multiplyFractions(base.expectedValue, fraction(k, 1)),
          );
        },
      ),
    );
  });

  it('edge is exactly zero when trueProbability equals the implied probability', () => {
    fc.assert(
      fc.property(oddsArb, (odds) => {
        const fairProbability = impliedProbability(odds);
        expect(calculateEdge(fairProbability, odds)).toEqual(ZERO);
      }),
    );
  });

  it('edge sign always matches whether trueProbability beats the implied probability', () => {
    fc.assert(
      fc.property(probabilityArb, oddsArb, (probability, odds) => {
        const edge = calculateEdge(probability, odds);
        const beatsImplied =
          compareFractions(probability, impliedProbability(odds)) > 0;
        expect(compareFractions(edge, ZERO) > 0).toBe(beatsImplied);
      }),
    );
  });

  it('expectedValue.edge is always consistent with calculateEdge', () => {
    fc.assert(
      fc.property(
        probabilityArb,
        oddsArb,
        stakeArb,
        (probability, odds, stake) => {
          const result = calculateExpectedValue(probability, odds, stake);
          expect(result.edge).toEqual(calculateEdge(probability, odds));
        },
      ),
    );
  });

  it('expectedValue is always exactly stake × edge', () => {
    fc.assert(
      fc.property(
        probabilityArb,
        oddsArb,
        stakeArb,
        (probability, odds, stake) => {
          const result = calculateExpectedValue(probability, odds, stake);
          expect(result.expectedValue).toEqual(
            multiplyFractions(stake, result.edge),
          );
        },
      ),
    );
  });
});
