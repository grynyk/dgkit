import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { calculateEdge } from './expected-value';
import {
  compareFractions,
  fraction,
  multiplyFractions,
  ONE,
  ZERO,
  type Fraction,
} from './fraction';
import { calculateKellyStake } from './kelly';

describe('calculateKellyStake', () => {
  it('recommends the full-Kelly stake by default', () => {
    const result = calculateKellyStake(
      fraction(3, 5),
      fraction(2, 1),
      fraction(1_000, 1),
    );

    expect(result).toEqual({
      edge: fraction(1, 5),
      fullKellyFraction: fraction(1, 5),
      appliedFraction: fraction(1, 5),
      recommendedStake: fraction(200, 1),
      hasEdge: true,
    });
  });

  it('halves the recommended stake for a half-Kelly fraction', () => {
    const result = calculateKellyStake(
      fraction(3, 5),
      fraction(2, 1),
      fraction(1_000, 1),
      fraction(1, 2),
    );

    expect(result.appliedFraction).toEqual(fraction(1, 10));
    expect(result.recommendedStake).toEqual(fraction(100, 1));
  });

  it('recommends staking zero when there is no edge', () => {
    const result = calculateKellyStake(
      fraction(2, 5),
      fraction(2, 1),
      fraction(1_000, 1),
    );

    expect(result.edge).toEqual(fraction(-1, 5));
    expect(result.hasEdge).toBe(false);
    expect(result.recommendedStake).toEqual(ZERO);
    // The diagnostic fields stay signed/unclamped.
    expect(compareFractions(result.fullKellyFraction, ZERO)).toBe(-1);
  });

  it('clamps the recommended stake to the bankroll when kellyFraction exceeds 1', () => {
    const result = calculateKellyStake(
      fraction(9, 10),
      fraction(2, 1),
      fraction(1_000, 1),
      fraction(2, 1),
    );

    expect(result.fullKellyFraction).toEqual(fraction(4, 5));
    expect(result.appliedFraction).toEqual(fraction(8, 5)); // unclamped, > 1
    expect(result.recommendedStake).toEqual(fraction(1_000, 1)); // clamped to bankroll
  });

  it('reaches recommendedStake === bankroll exactly at fairProbability === 1', () => {
    const result = calculateKellyStake(ONE, fraction(2, 1), fraction(500, 1));

    expect(result.fullKellyFraction).toEqual(ONE);
    expect(result.recommendedStake).toEqual(fraction(500, 1));
  });

  it('rejects a non-positive bankroll', () => {
    expect(() =>
      calculateKellyStake(fraction(3, 5), fraction(2, 1), ZERO),
    ).toThrow(RangeError);
    expect(() =>
      calculateKellyStake(fraction(3, 5), fraction(2, 1), fraction(-1, 1)),
    ).toThrow(RangeError);
  });

  it('rejects a non-positive kellyFraction', () => {
    expect(() =>
      calculateKellyStake(
        fraction(3, 5),
        fraction(2, 1),
        fraction(1_000, 1),
        ZERO,
      ),
    ).toThrow(RangeError);
    expect(() =>
      calculateKellyStake(
        fraction(3, 5),
        fraction(2, 1),
        fraction(1_000, 1),
        fraction(-1, 2),
      ),
    ).toThrow(RangeError);
  });

  it('bubbles up calculateEdge validation for probability/odds', () => {
    expect(() =>
      calculateKellyStake(ZERO, fraction(2, 1), fraction(1_000, 1)),
    ).toThrow(RangeError);
    expect(() =>
      calculateKellyStake(fraction(3, 5), ONE, fraction(1_000, 1)),
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

  const bankrollArb = fc
    .integer({ min: 1, max: 1_000_000 })
    .map((n) => fraction(n, 1));

  const kellyFractionArb: fc.Arbitrary<Fraction> = fc
    .tuple(fc.integer({ min: 1, max: 400 }), fc.integer({ min: 1, max: 100 }))
    .map(([a, b]) => fraction(a, b));

  it('recommendedStake is always within [0, bankroll]', () => {
    fc.assert(
      fc.property(
        probabilityArb,
        oddsArb,
        bankrollArb,
        kellyFractionArb,
        (probability, odds, bankroll, kellyFraction) => {
          const { recommendedStake } = calculateKellyStake(
            probability,
            odds,
            bankroll,
            kellyFraction,
          );
          expect(
            compareFractions(recommendedStake, ZERO),
          ).toBeGreaterThanOrEqual(0);
          expect(
            compareFractions(recommendedStake, bankroll),
          ).toBeLessThanOrEqual(0);
        },
      ),
    );
  });

  it('recommendedStake is exactly zero iff there is no edge', () => {
    fc.assert(
      fc.property(
        probabilityArb,
        oddsArb,
        bankrollArb,
        kellyFractionArb,
        (probability, odds, bankroll, kellyFraction) => {
          const result = calculateKellyStake(
            probability,
            odds,
            bankroll,
            kellyFraction,
          );
          expect(result.recommendedStake.num === 0n).toBe(!result.hasEdge);
        },
      ),
    );
  });

  it('appliedFraction scales exactly with kellyFraction', () => {
    fc.assert(
      fc.property(
        probabilityArb,
        oddsArb,
        bankrollArb,
        kellyFractionArb,
        fc.integer({ min: 1, max: 10 }),
        (probability, odds, bankroll, kellyFraction, k) => {
          const base = calculateKellyStake(
            probability,
            odds,
            bankroll,
            kellyFraction,
          );
          const scaled = calculateKellyStake(
            probability,
            odds,
            bankroll,
            multiplyFractions(kellyFraction, fraction(k, 1)),
          );
          expect(scaled.appliedFraction).toEqual(
            multiplyFractions(base.appliedFraction, fraction(k, 1)),
          );
        },
      ),
    );
  });

  it('edge is monotonically increasing in fairProbability for fixed odds', () => {
    fc.assert(
      fc.property(
        probabilityArb,
        probabilityArb,
        oddsArb,
        bankrollArb,
        (p1, p2, odds, bankroll) => {
          const [lower, higher] =
            compareFractions(p1, p2) <= 0 ? [p1, p2] : [p2, p1];
          const lowerResult = calculateKellyStake(lower, odds, bankroll);
          const higherResult = calculateKellyStake(higher, odds, bankroll);
          expect(
            compareFractions(higherResult.edge, lowerResult.edge),
          ).toBeGreaterThanOrEqual(0);
        },
      ),
    );
  });

  it('edge is always consistent with calculateEdge', () => {
    fc.assert(
      fc.property(
        probabilityArb,
        oddsArb,
        bankrollArb,
        (probability, odds, bankroll) => {
          const result = calculateKellyStake(probability, odds, bankroll);
          expect(result.edge).toEqual(calculateEdge(probability, odds));
        },
      ),
    );
  });
});
