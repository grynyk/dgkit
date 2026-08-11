import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  addFractions,
  compareFractions,
  fraction,
  ONE,
  ZERO,
  type Fraction,
} from './fraction';
import { applyProfitBoost } from './profit-boost';

describe('applyProfitBoost', () => {
  it('boosts winnings by the given percent, uncapped', () => {
    const result = applyProfitBoost({
      stake: fraction(10, 1),
      decimalOdds: fraction(3, 1),
      boostPercent: fraction(1, 2),
    });

    expect(result).toEqual({
      baseWinnings: fraction(20, 1),
      boostAmount: fraction(10, 1),
      boostedPayout: fraction(40, 1),
      boostedOdds: fraction(4, 1),
    });
  });

  it('caps the boost amount when it exceeds maxBoostAmount', () => {
    const result = applyProfitBoost({
      stake: fraction(10, 1),
      decimalOdds: fraction(3, 1),
      boostPercent: fraction(1, 2),
      maxBoostAmount: fraction(5, 1),
    });

    expect(result.boostAmount).toEqual(fraction(5, 1));
    expect(result.boostedPayout).toEqual(fraction(35, 1));
    expect(result.boostedOdds).toEqual(fraction(7, 2));
  });

  it('leaves the boost amount unchanged when maxBoostAmount exceeds it', () => {
    const result = applyProfitBoost({
      stake: fraction(10, 1),
      decimalOdds: fraction(3, 1),
      boostPercent: fraction(1, 2),
      maxBoostAmount: fraction(100, 1),
    });

    expect(result.boostAmount).toEqual(fraction(10, 1));
  });

  it('a 0% boost leaves boostedOdds exactly equal to decimalOdds', () => {
    const result = applyProfitBoost({
      stake: fraction(10, 1),
      decimalOdds: fraction(3, 1),
      boostPercent: ZERO,
    });

    expect(result.boostAmount).toEqual(ZERO);
    expect(result.boostedOdds).toEqual(fraction(3, 1));
  });

  it('rejects a non-positive stake', () => {
    expect(() =>
      applyProfitBoost({
        stake: ZERO,
        decimalOdds: fraction(3, 1),
        boostPercent: ZERO,
      }),
    ).toThrow(RangeError);
  });

  it('rejects decimalOdds not greater than 1', () => {
    expect(() =>
      applyProfitBoost({
        stake: fraction(10, 1),
        decimalOdds: ONE,
        boostPercent: ZERO,
      }),
    ).toThrow(RangeError);
  });

  it('rejects a negative boostPercent', () => {
    expect(() =>
      applyProfitBoost({
        stake: fraction(10, 1),
        decimalOdds: fraction(3, 1),
        boostPercent: fraction(-1, 10),
      }),
    ).toThrow(RangeError);
  });

  it('rejects a negative maxBoostAmount', () => {
    expect(() =>
      applyProfitBoost({
        stake: fraction(10, 1),
        decimalOdds: fraction(3, 1),
        boostPercent: fraction(1, 2),
        maxBoostAmount: fraction(-1, 1),
      }),
    ).toThrow(RangeError);
  });

  /** Odds strictly greater than 1, generated from a bounded integer pair. */
  const oddsArb: fc.Arbitrary<Fraction> = fc
    .tuple(fc.integer({ min: 1, max: 500 }), fc.integer({ min: 1, max: 50 }))
    .map(([a, b]) => fraction(a + b, b));

  const stakeArb = fc
    .integer({ min: 1, max: 100_000 })
    .map((n) => fraction(n, 1));

  /** A non-negative percent, generated as a percentage point out of 100 (0-500%). */
  const boostPercentArb: fc.Arbitrary<Fraction> = fc
    .integer({ min: 0, max: 500 })
    .map((pct) => fraction(pct, 100));

  it('never decreases the payout relative to the base bet', () => {
    fc.assert(
      fc.property(
        stakeArb,
        oddsArb,
        boostPercentArb,
        (stake, decimalOdds, boostPercent) => {
          const result = applyProfitBoost({ stake, decimalOdds, boostPercent });
          const unboostedPayout = addFractions(stake, result.baseWinnings);
          expect(
            compareFractions(result.boostedPayout, unboostedPayout),
          ).toBeGreaterThanOrEqual(0);
        },
      ),
    );
  });

  it('boostedPayout is always exactly stake + baseWinnings + boostAmount', () => {
    fc.assert(
      fc.property(
        stakeArb,
        oddsArb,
        boostPercentArb,
        (stake, decimalOdds, boostPercent) => {
          const result = applyProfitBoost({ stake, decimalOdds, boostPercent });
          expect(result.boostedPayout).toEqual(
            addFractions(
              addFractions(stake, result.baseWinnings),
              result.boostAmount,
            ),
          );
        },
      ),
    );
  });

  it('boostAmount never exceeds maxBoostAmount when supplied', () => {
    fc.assert(
      fc.property(
        stakeArb,
        oddsArb,
        boostPercentArb,
        stakeArb,
        (stake, decimalOdds, boostPercent, maxBoostAmount) => {
          const result = applyProfitBoost({
            stake,
            decimalOdds,
            boostPercent,
            maxBoostAmount,
          });
          expect(
            compareFractions(result.boostAmount, maxBoostAmount),
          ).toBeLessThanOrEqual(0);
        },
      ),
    );
  });
});
