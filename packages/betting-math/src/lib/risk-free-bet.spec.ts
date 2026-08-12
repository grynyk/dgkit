import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { calculateFreeBetLayStake } from './free-bet';
import { calculateExchangeLayStake } from './hedge';
import {
  addFractions,
  compareFractions,
  fraction,
  multiplyFractions,
  ONE,
  subtractFractions,
  ZERO,
  type Fraction,
} from './fraction';
import {
  calculateRiskFreeBetLayStake,
  type RiskFreeBetInput,
} from './risk-free-bet';

const baseInput: RiskFreeBetInput = {
  backStake: fraction(100, 1),
  backOdds: fraction(2, 1),
  layOdds: fraction(2, 1),
  commission: ZERO,
  refundCap: fraction(100, 1),
  refundBackOdds: fraction(5, 1),
  refundLayOdds: fraction(5, 1),
  refundCommission: ZERO,
};

describe('calculateRiskFreeBetLayStake', () => {
  it('needs a smaller lay and locks in a real profit vs. a plain qualifying bet', () => {
    const result = calculateRiskFreeBetLayStake(baseInput);

    expect(result).toEqual({
      layStake: fraction(60, 1),
      liability: fraction(60, 1),
      refundAmount: fraction(100, 1),
      refundValue: fraction(80, 1),
      guaranteedProfit: fraction(40, 1),
    });
  });

  it('reduces exactly to calculateExchangeLayStake at refundCap = 0', () => {
    const result = calculateRiskFreeBetLayStake({
      ...baseInput,
      refundCap: ZERO,
    });
    const plain = calculateExchangeLayStake(
      baseInput.backStake,
      baseInput.backOdds,
      baseInput.layOdds,
      baseInput.commission,
    );

    expect(result.refundAmount).toEqual(ZERO);
    expect(result.refundValue).toEqual(ZERO);
    expect(result.layStake).toEqual(plain.layStake);
    expect(result.guaranteedProfit).toEqual(plain.guaranteedProfit);
  });

  it('caps refundAmount at backStake when refundCap exceeds it', () => {
    const result = calculateRiskFreeBetLayStake({
      ...baseInput,
      refundCap: fraction(500, 1),
    });
    expect(result.refundAmount).toEqual(baseInput.backStake);
  });

  it('rejects a non-positive backStake', () => {
    expect(() =>
      calculateRiskFreeBetLayStake({ ...baseInput, backStake: ZERO }),
    ).toThrow(RangeError);
  });

  it('rejects odds not greater than 1', () => {
    expect(() =>
      calculateRiskFreeBetLayStake({ ...baseInput, backOdds: ONE }),
    ).toThrow(RangeError);
    expect(() =>
      calculateRiskFreeBetLayStake({ ...baseInput, layOdds: ONE }),
    ).toThrow(RangeError);
  });

  it('rejects a commission outside [0, 1)', () => {
    expect(() =>
      calculateRiskFreeBetLayStake({ ...baseInput, commission: ONE }),
    ).toThrow(RangeError);
  });

  it('rejects a negative refundCap', () => {
    expect(() =>
      calculateRiskFreeBetLayStake({
        ...baseInput,
        refundCap: fraction(-1, 1),
      }),
    ).toThrow(RangeError);
  });

  it('rejects invalid refund odds/commission even when refundCap is 0', () => {
    expect(() =>
      calculateRiskFreeBetLayStake({
        ...baseInput,
        refundCap: ZERO,
        refundBackOdds: ONE,
      }),
    ).toThrow(RangeError);
    expect(() =>
      calculateRiskFreeBetLayStake({
        ...baseInput,
        refundCap: ZERO,
        refundLayOdds: ONE,
      }),
    ).toThrow(RangeError);
    expect(() =>
      calculateRiskFreeBetLayStake({
        ...baseInput,
        refundCap: ZERO,
        refundCommission: ONE,
      }),
    ).toThrow(RangeError);
  });

  it('throws when the refund market is so favorable that refundValue would reach or exceed backStake × backOdds', () => {
    // A heavy-favorite qualifier (odds 1.1) paired with a refund re-backed
    // at much longer odds (20) extracts more value than the qualifying bet
    // itself returns — no positive lay stake can equalize that.
    expect(() =>
      calculateRiskFreeBetLayStake({
        backStake: fraction(100, 1),
        backOdds: fraction(11, 10),
        layOdds: fraction(11, 10),
        commission: ZERO,
        refundCap: fraction(100, 1),
        refundBackOdds: fraction(20, 1),
        refundLayOdds: fraction(21, 20),
        refundCommission: ZERO,
      }),
    ).toThrow(RangeError);
  });

  /** Odds strictly greater than 1, generated from a bounded integer pair. */
  const oddsArb: fc.Arbitrary<Fraction> = fc
    .tuple(fc.integer({ min: 1, max: 5_000 }), fc.integer({ min: 1, max: 500 }))
    .map(([a, b]) => fraction(a + b, b));

  const stakeArb = fc
    .integer({ min: 1, max: 100_000 })
    .map((n) => fraction(n, 1));

  /** Commission in [0, 1), generated as a percentage point out of 100. */
  const commissionArb: fc.Arbitrary<Fraction> = fc
    .integer({ min: 0, max: 99 })
    .map((pct) => fraction(pct, 100));

  /** A refundCap fraction of backStake, from 0% to 150% (so both clamped and unclamped cases occur). */
  const refundCapFractionArb: fc.Arbitrary<Fraction> = fc
    .integer({ min: 0, max: 150 })
    .map((pct) => fraction(pct, 100));

  it('profit is identical whichever side wins', () => {
    fc.assert(
      fc.property(
        stakeArb,
        oddsArb,
        oddsArb,
        commissionArb,
        refundCapFractionArb,
        oddsArb,
        oddsArb,
        commissionArb,
        (
          backStake,
          backOdds,
          layOdds,
          commission,
          refundCapFraction,
          refundBackOdds,
          refundLayOdds,
          refundCommission,
        ) => {
          const refundCap = multiplyFractions(backStake, refundCapFraction);
          const refundAmount =
            compareFractions(refundCap, backStake) < 0 ? refundCap : backStake;
          const refundValue =
            compareFractions(refundAmount, ZERO) > 0
              ? calculateFreeBetLayStake(
                  refundAmount,
                  refundBackOdds,
                  refundLayOdds,
                  refundCommission,
                ).guaranteedProfit
              : ZERO;
          // Skip inputs where the refund market is so favorable that
          // refundValue would reach or exceed backStake × backOdds — those
          // correctly throw (see risk-free-bet.spec.ts's dedicated test)
          // rather than returning a nonsensical negative layStake.
          fc.pre(
            compareFractions(
              multiplyFractions(backStake, backOdds),
              refundValue,
            ) > 0,
          );

          const result = calculateRiskFreeBetLayStake({
            backStake,
            backOdds,
            layOdds,
            commission,
            refundCap,
            refundBackOdds,
            refundLayOdds,
            refundCommission,
          });

          const profitIfBackWins = subtractFractions(
            multiplyFractions(backStake, subtractFractions(backOdds, ONE)),
            multiplyFractions(result.layStake, subtractFractions(layOdds, ONE)),
          );
          const profitIfLayWins = addFractions(
            subtractFractions(
              multiplyFractions(
                result.layStake,
                subtractFractions(ONE, commission),
              ),
              backStake,
            ),
            result.refundValue,
          );

          expect(profitIfBackWins).toEqual(result.guaranteedProfit);
          expect(profitIfLayWins).toEqual(result.guaranteedProfit);
        },
      ),
    );
  });

  it('liability is always exactly layStake × (layOdds − 1)', () => {
    fc.assert(
      fc.property(
        stakeArb,
        oddsArb,
        oddsArb,
        (backStake, backOdds, layOdds) => {
          const result = calculateRiskFreeBetLayStake({
            ...baseInput,
            backStake,
            backOdds,
            layOdds,
          });
          expect(result.liability).toEqual(
            multiplyFractions(result.layStake, subtractFractions(layOdds, ONE)),
          );
        },
      ),
    );
  });

  it('refundAmount is always min(backStake, refundCap)', () => {
    fc.assert(
      fc.property(
        stakeArb,
        refundCapFractionArb,
        (backStake, refundCapFraction) => {
          const refundCap = multiplyFractions(backStake, refundCapFraction);
          const result = calculateRiskFreeBetLayStake({
            ...baseInput,
            backStake,
            refundCap,
          });
          const expected =
            compareFractions(refundCap, backStake) < 0 ? refundCap : backStake;
          expect(result.refundAmount).toEqual(expected);
        },
      ),
    );
  });
});
