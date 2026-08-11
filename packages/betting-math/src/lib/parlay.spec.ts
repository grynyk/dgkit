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
import {
  calculateParlayExpectedValue,
  calculateParlayKellyStake,
  combineParlayLegs,
  type ParlayLeg,
} from './parlay';

const evenLeg: ParlayLeg = {
  trueProbability: fraction(3, 5),
  decimalOdds: fraction(2, 1),
};
const treble = [evenLeg, evenLeg, evenLeg];

describe('combineParlayLegs', () => {
  it('multiplies probability and odds across every leg', () => {
    expect(combineParlayLegs(treble)).toEqual({
      probability: fraction(27, 125),
      odds: fraction(8, 1),
    });
  });

  it('a single-leg parlay is exactly that leg itself', () => {
    expect(combineParlayLegs([evenLeg])).toEqual({
      probability: fraction(3, 5),
      odds: fraction(2, 1),
    });
  });

  it('rejects an empty legs array', () => {
    expect(() => combineParlayLegs([])).toThrow(RangeError);
  });

  it('rejects a leg with trueProbability outside (0, 1], naming the leg index', () => {
    expect(() =>
      combineParlayLegs([
        evenLeg,
        { trueProbability: ZERO, decimalOdds: fraction(2, 1) },
      ]),
    ).toThrow(/leg 1/);
    expect(() =>
      combineParlayLegs([
        evenLeg,
        { trueProbability: fraction(3, 2), decimalOdds: fraction(2, 1) },
      ]),
    ).toThrow(/leg 1/);
  });

  it('rejects a leg with decimalOdds not greater than 1, naming the leg index', () => {
    expect(() =>
      combineParlayLegs([
        evenLeg,
        { trueProbability: fraction(3, 5), decimalOdds: ONE },
      ]),
    ).toThrow(/leg 1/);
  });

  /** Probability in (0, 1], generated from a bounded integer pair. */
  const probabilityArb: fc.Arbitrary<Fraction> = fc
    .tuple(fc.integer({ min: 1, max: 50 }), fc.integer({ min: 1, max: 50 }))
    .map(([a, b]) => fraction(Math.min(a, b), Math.max(a, b)));

  /** Odds strictly greater than 1, generated from a bounded integer pair. */
  const oddsArb: fc.Arbitrary<Fraction> = fc
    .tuple(fc.integer({ min: 1, max: 500 }), fc.integer({ min: 1, max: 50 }))
    .map(([a, b]) => fraction(a + b, b));

  const legArb: fc.Arbitrary<ParlayLeg> = fc.record({
    trueProbability: probabilityArb,
    decimalOdds: oddsArb,
  });

  const legsArb = fc.array(legArb, { minLength: 1, maxLength: 5 });

  it('probability is always in (0, 1]', () => {
    fc.assert(
      fc.property(legsArb, (legs) => {
        const { probability } = combineParlayLegs(legs);
        expect(compareFractions(probability, ZERO)).toBeGreaterThan(0);
        expect(compareFractions(probability, ONE)).toBeLessThanOrEqual(0);
      }),
    );
  });

  it('odds is always greater than 1', () => {
    fc.assert(
      fc.property(legsArb, (legs) => {
        const { odds } = combineParlayLegs(legs);
        expect(compareFractions(odds, ONE)).toBeGreaterThan(0);
      }),
    );
  });

  it('is associative — splitting legs into two groups and recombining gives the same price', () => {
    fc.assert(
      fc.property(legsArb, legsArb, (legsA, legsB) => {
        const whole = combineParlayLegs([...legsA, ...legsB]);
        const a = combineParlayLegs(legsA);
        const b = combineParlayLegs(legsB);
        expect(whole.probability).toEqual(
          multiplyFractions(a.probability, b.probability),
        );
        expect(whole.odds).toEqual(multiplyFractions(a.odds, b.odds));
      }),
    );
  });
});

describe('calculateParlayExpectedValue', () => {
  it('compounds a positive per-leg edge multiplicatively', () => {
    const result = calculateParlayExpectedValue(treble, fraction(100, 1));

    expect(result.price).toEqual({
      probability: fraction(27, 125),
      odds: fraction(8, 1),
    });
    expect(result.edge).toEqual(fraction(91, 125));
    expect(result.expectedValue).toEqual(fraction(364, 5));
  });

  it('matches calculateExpectedValue on the combined price', () => {
    const result = calculateParlayExpectedValue(treble, fraction(100, 1));
    const { price } = result;
    expect(result.edge).toEqual(calculateEdge(price.probability, price.odds));
  });

  it('rejects a non-positive stake', () => {
    expect(() => calculateParlayExpectedValue(treble, ZERO)).toThrow(
      RangeError,
    );
    expect(() => calculateParlayExpectedValue(treble, fraction(-1, 1))).toThrow(
      RangeError,
    );
  });

  it('bubbles up combineParlayLegs validation', () => {
    expect(() => calculateParlayExpectedValue([], fraction(100, 1))).toThrow(
      RangeError,
    );
  });
});

describe('calculateParlayKellyStake', () => {
  it('sizes the full-Kelly stake from the combined price', () => {
    const result = calculateParlayKellyStake(treble, fraction(1_000, 1));

    expect(result.price).toEqual({
      probability: fraction(27, 125),
      odds: fraction(8, 1),
    });
    expect(result.fullKellyFraction).toEqual(fraction(13, 125));
    expect(result.recommendedStake).toEqual(fraction(104, 1));
    expect(result.hasEdge).toBe(true);
  });

  it('halves the recommended stake for a half-Kelly fraction', () => {
    const result = calculateParlayKellyStake(
      treble,
      fraction(1_000, 1),
      fraction(1, 2),
    );
    expect(result.recommendedStake).toEqual(fraction(52, 1));
  });

  it('rejects a non-positive bankroll', () => {
    expect(() => calculateParlayKellyStake(treble, ZERO)).toThrow(RangeError);
  });

  it('rejects a non-positive kellyFraction', () => {
    expect(() =>
      calculateParlayKellyStake(treble, fraction(1_000, 1), ZERO),
    ).toThrow(RangeError);
  });

  it('bubbles up combineParlayLegs validation', () => {
    expect(() => calculateParlayKellyStake([], fraction(1_000, 1))).toThrow(
      RangeError,
    );
  });

  /** Probability in (0, 1], generated from a bounded integer pair. */
  const probabilityArb: fc.Arbitrary<Fraction> = fc
    .tuple(fc.integer({ min: 1, max: 50 }), fc.integer({ min: 1, max: 50 }))
    .map(([a, b]) => fraction(Math.min(a, b), Math.max(a, b)));

  /** Odds strictly greater than 1, generated from a bounded integer pair. */
  const oddsArb: fc.Arbitrary<Fraction> = fc
    .tuple(fc.integer({ min: 1, max: 500 }), fc.integer({ min: 1, max: 50 }))
    .map(([a, b]) => fraction(a + b, b));

  const legArb: fc.Arbitrary<ParlayLeg> = fc.record({
    trueProbability: probabilityArb,
    decimalOdds: oddsArb,
  });

  const legsArb = fc.array(legArb, { minLength: 1, maxLength: 5 });

  const bankrollArb = fc
    .integer({ min: 1, max: 1_000_000 })
    .map((n) => fraction(n, 1));

  it('recommendedStake is always within [0, bankroll]', () => {
    fc.assert(
      fc.property(legsArb, bankrollArb, (legs, bankroll) => {
        const { recommendedStake } = calculateParlayKellyStake(legs, bankroll);
        expect(compareFractions(recommendedStake, ZERO)).toBeGreaterThanOrEqual(
          0,
        );
        expect(
          compareFractions(recommendedStake, bankroll),
        ).toBeLessThanOrEqual(0);
      }),
    );
  });
});
