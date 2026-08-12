import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { calculateAccaInsuranceExpectedValue } from './acca-insurance';
import {
  addFractions,
  compareFractions,
  fraction,
  multiplyFractions,
  ONE,
  ZERO,
  type Fraction,
} from './fraction';
import { calculateParlayExpectedValue, type ParlayLeg } from './parlay';

const evenLeg: ParlayLeg = {
  trueProbability: fraction(3, 5),
  decimalOdds: fraction(2, 1),
};
const treble = [evenLeg, evenLeg, evenLeg];

describe('calculateAccaInsuranceExpectedValue', () => {
  it('weights the refund by the probability of exactly one leg losing', () => {
    const result = calculateAccaInsuranceExpectedValue(
      treble,
      fraction(100, 1),
      1,
      fraction(80, 1),
    );

    expect(result.price).toEqual({
      probability: fraction(27, 125),
      odds: fraction(8, 1),
    });
    expect(result.winProbability).toEqual(fraction(27, 125));
    expect(result.insuranceProbability).toEqual(fraction(54, 125));
    expect(result.expectedValue).toEqual(fraction(2_684, 25));
  });

  it('reduces exactly to calculateParlayExpectedValue at maxInsuredLosses = 0', () => {
    const result = calculateAccaInsuranceExpectedValue(
      treble,
      fraction(100, 1),
      0,
      fraction(999, 1), // refundValue must not matter — insuranceProbability is 0
    );
    const plain = calculateParlayExpectedValue(treble, fraction(100, 1));

    expect(result.insuranceProbability).toEqual(ZERO);
    expect(result.expectedValue).toEqual(plain.expectedValue);
  });

  it('rejects a non-positive stake', () => {
    expect(() =>
      calculateAccaInsuranceExpectedValue(treble, ZERO, 1, fraction(80, 1)),
    ).toThrow(RangeError);
  });

  it('rejects an empty legs array', () => {
    expect(() =>
      calculateAccaInsuranceExpectedValue(
        [],
        fraction(100, 1),
        0,
        fraction(80, 1),
      ),
    ).toThrow(RangeError);
  });

  it('rejects a non-integer maxInsuredLosses', () => {
    expect(() =>
      calculateAccaInsuranceExpectedValue(
        treble,
        fraction(100, 1),
        1.5,
        fraction(80, 1),
      ),
    ).toThrow(RangeError);
  });

  it('rejects a negative maxInsuredLosses', () => {
    expect(() =>
      calculateAccaInsuranceExpectedValue(
        treble,
        fraction(100, 1),
        -1,
        fraction(80, 1),
      ),
    ).toThrow(RangeError);
  });

  it('rejects maxInsuredLosses >= legs.length', () => {
    expect(() =>
      calculateAccaInsuranceExpectedValue(
        treble,
        fraction(100, 1),
        3,
        fraction(80, 1),
      ),
    ).toThrow(RangeError);
  });

  it('rejects a negative refundValue', () => {
    expect(() =>
      calculateAccaInsuranceExpectedValue(
        treble,
        fraction(100, 1),
        1,
        fraction(-1, 1),
      ),
    ).toThrow(RangeError);
  });

  it('stays fast for a large accumulator (no combinatorial blowup)', () => {
    const bigLeg: ParlayLeg = {
      trueProbability: fraction(9, 10),
      decimalOdds: fraction(11, 10),
    };
    const legs = Array.from({ length: 25 }, () => bigLeg);

    const result = calculateAccaInsuranceExpectedValue(
      legs,
      fraction(100, 1),
      24,
      fraction(80, 1),
    );

    expect(compareFractions(result.insuranceProbability, ZERO)).toBe(1);
    expect(compareFractions(result.insuranceProbability, ONE)).toBe(-1);
  });

  /** Probability in (0, 1], generated from a bounded integer pair. */
  const probabilityArb: fc.Arbitrary<Fraction> = fc
    .tuple(fc.integer({ min: 1, max: 20 }), fc.integer({ min: 1, max: 20 }))
    .map(([a, b]) => fraction(Math.min(a, b), Math.max(a, b)));

  /** Odds strictly greater than 1, generated from a bounded integer pair. */
  const oddsArb: fc.Arbitrary<Fraction> = fc
    .tuple(fc.integer({ min: 1, max: 200 }), fc.integer({ min: 1, max: 20 }))
    .map(([a, b]) => fraction(a + b, b));

  const legArb: fc.Arbitrary<ParlayLeg> = fc.record({
    trueProbability: probabilityArb,
    decimalOdds: oddsArb,
  });

  /** 2-5 legs, so a nonzero maxInsuredLosses is always valid. */
  const legsArb = fc.array(legArb, { minLength: 2, maxLength: 5 });

  const stakeArb = fc
    .integer({ min: 1, max: 100_000 })
    .map((n) => fraction(n, 1));
  const refundValueArb = fc
    .integer({ min: 0, max: 100_000 })
    .map((n) => fraction(n, 1));

  it('winProbability + insuranceProbability never exceeds 1', () => {
    fc.assert(
      fc.property(
        legsArb,
        stakeArb,
        refundValueArb,
        (legs, stake, refundValue) => {
          const maxInsuredLosses = legs.length - 1;
          const result = calculateAccaInsuranceExpectedValue(
            legs,
            stake,
            maxInsuredLosses,
            refundValue,
          );
          const covered = addFractions(
            result.winProbability,
            result.insuranceProbability,
          );
          expect(compareFractions(covered, ONE)).toBeLessThanOrEqual(0);
        },
      ),
    );
  });

  it('increasing maxInsuredLosses never decreases insuranceProbability', () => {
    fc.assert(
      fc.property(
        legsArb,
        stakeArb,
        refundValueArb,
        (legs, stake, refundValue) => {
          const maxK = legs.length - 1;
          fc.pre(maxK >= 1);
          const lower = calculateAccaInsuranceExpectedValue(
            legs,
            stake,
            maxK - 1,
            refundValue,
          );
          const higher = calculateAccaInsuranceExpectedValue(
            legs,
            stake,
            maxK,
            refundValue,
          );
          expect(
            compareFractions(
              higher.insuranceProbability,
              lower.insuranceProbability,
            ),
          ).toBeGreaterThanOrEqual(0);
        },
      ),
    );
  });

  it('expectedValue is always exactly the parlay EV plus the weighted refund', () => {
    fc.assert(
      fc.property(
        legsArb,
        stakeArb,
        refundValueArb,
        (legs, stake, refundValue) => {
          const maxInsuredLosses = legs.length - 1;
          const result = calculateAccaInsuranceExpectedValue(
            legs,
            stake,
            maxInsuredLosses,
            refundValue,
          );
          const plain = calculateParlayExpectedValue(legs, stake);
          expect(result.expectedValue).toEqual(
            addFractions(
              plain.expectedValue,
              multiplyFractions(result.insuranceProbability, refundValue),
            ),
          );
        },
      ),
    );
  });
});
