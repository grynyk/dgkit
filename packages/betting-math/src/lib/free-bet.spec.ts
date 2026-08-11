import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  compareFractions,
  divideFractions,
  fraction,
  multiplyFractions,
  ONE,
  subtractFractions,
  ZERO,
  type Fraction,
} from './fraction';
import { calculateFreeBetLayStake } from './free-bet';

describe('calculateFreeBetLayStake', () => {
  it('extracts 80% of face value at matching odds and zero commission', () => {
    const result = calculateFreeBetLayStake(
      fraction(10, 1),
      fraction(5, 1),
      fraction(5, 1),
      ZERO,
    );

    expect(result).toEqual({
      layStake: fraction(8, 1),
      liability: fraction(32, 1),
      guaranteedProfit: fraction(8, 1),
      extractionRate: fraction(4, 5),
    });
  });

  it('extracts less once commission is applied', () => {
    const result = calculateFreeBetLayStake(
      fraction(10, 1),
      fraction(5, 1),
      fraction(5, 1),
      fraction(1, 20), // 5%
    );

    // layStake = 40 / 4.95 = 800/99
    expect(result.layStake).toEqual(fraction(800, 99));
    expect(compareFractions(result.guaranteedProfit, fraction(8, 1))).toBe(-1);
  });

  it('rejects a non-positive freeBetStake', () => {
    expect(() =>
      calculateFreeBetLayStake(ZERO, fraction(5, 1), fraction(5, 1), ZERO),
    ).toThrow(RangeError);
    expect(() =>
      calculateFreeBetLayStake(
        fraction(-1, 1),
        fraction(5, 1),
        fraction(5, 1),
        ZERO,
      ),
    ).toThrow(RangeError);
  });

  it('rejects odds not greater than 1', () => {
    expect(() =>
      calculateFreeBetLayStake(fraction(10, 1), ONE, fraction(5, 1), ZERO),
    ).toThrow(RangeError);
    expect(() =>
      calculateFreeBetLayStake(fraction(10, 1), fraction(5, 1), ONE, ZERO),
    ).toThrow(RangeError);
  });

  it('rejects a commission outside [0, 1)', () => {
    expect(() =>
      calculateFreeBetLayStake(
        fraction(10, 1),
        fraction(5, 1),
        fraction(5, 1),
        fraction(-1, 100),
      ),
    ).toThrow(RangeError);
    expect(() =>
      calculateFreeBetLayStake(
        fraction(10, 1),
        fraction(5, 1),
        fraction(5, 1),
        ONE,
      ),
    ).toThrow(RangeError);
  });

  /** Odds strictly greater than 1, generated from a bounded integer pair. */
  const oddsArb: fc.Arbitrary<Fraction> = fc
    .tuple(
      fc.integer({ min: 1, max: 10_000 }),
      fc.integer({ min: 1, max: 1_000 }),
    )
    .map(([a, b]) => fraction(a + b, b));

  const stakeArb = fc
    .integer({ min: 1, max: 100_000 })
    .map((n) => fraction(n, 1));

  /** Commission in [0, 1), generated as a percentage point out of 100. */
  const commissionArb: fc.Arbitrary<Fraction> = fc
    .integer({ min: 0, max: 99 })
    .map((pct) => fraction(pct, 100));

  it('profit is identical whichever side wins', () => {
    fc.assert(
      fc.property(
        stakeArb,
        oddsArb,
        oddsArb,
        commissionArb,
        (freeBetStake, backOdds, layOdds, commission) => {
          const { layStake, guaranteedProfit } = calculateFreeBetLayStake(
            freeBetStake,
            backOdds,
            layOdds,
            commission,
          );
          const profitIfBackWins = subtractFractions(
            multiplyFractions(freeBetStake, subtractFractions(backOdds, ONE)),
            multiplyFractions(layStake, subtractFractions(layOdds, ONE)),
          );
          const profitIfLayWins = multiplyFractions(
            layStake,
            subtractFractions(ONE, commission),
          );
          expect(profitIfBackWins).toEqual(profitIfLayWins);
          expect(guaranteedProfit).toEqual(profitIfBackWins);
        },
      ),
    );
  });

  it('extractionRate is always exactly guaranteedProfit / freeBetStake', () => {
    fc.assert(
      fc.property(
        stakeArb,
        oddsArb,
        oddsArb,
        commissionArb,
        (freeBetStake, backOdds, layOdds, commission) => {
          const result = calculateFreeBetLayStake(
            freeBetStake,
            backOdds,
            layOdds,
            commission,
          );
          expect(result.extractionRate).toEqual(
            divideFractions(result.guaranteedProfit, freeBetStake),
          );
        },
      ),
    );
  });

  it('layStake is always positive', () => {
    fc.assert(
      fc.property(
        stakeArb,
        oddsArb,
        oddsArb,
        commissionArb,
        (freeBetStake, backOdds, layOdds, commission) => {
          const { layStake } = calculateFreeBetLayStake(
            freeBetStake,
            backOdds,
            layOdds,
            commission,
          );
          expect(compareFractions(layStake, ZERO)).toBeGreaterThan(0);
        },
      ),
    );
  });

  it('guaranteedProfit strictly decreases as commission increases', () => {
    fc.assert(
      fc.property(
        stakeArb,
        oddsArb,
        oddsArb,
        (freeBetStake, backOdds, layOdds) => {
          const lower = calculateFreeBetLayStake(
            freeBetStake,
            backOdds,
            layOdds,
            fraction(1, 100),
          );
          const higher = calculateFreeBetLayStake(
            freeBetStake,
            backOdds,
            layOdds,
            fraction(10, 100),
          );
          expect(
            compareFractions(higher.guaranteedProfit, lower.guaranteedProfit),
          ).toBeLessThan(0);
        },
      ),
    );
  });
});
