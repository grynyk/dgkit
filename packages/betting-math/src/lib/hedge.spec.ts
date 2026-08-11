import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  addFractions,
  compareFractions,
  divideFractions,
  fraction,
  multiplyFractions,
  ONE,
  subtractFractions,
  ZERO,
  type Fraction,
} from './fraction';
import { calculateExchangeLayStake, calculateHedgeStake } from './hedge';

describe('calculateHedgeStake', () => {
  it('locks in an equal profit whichever side wins', () => {
    const result = calculateHedgeStake(
      fraction(10, 1),
      fraction(5, 1),
      fraction(2, 1),
    );

    expect(result).toEqual({
      hedgeStake: fraction(25, 1),
      totalStaked: fraction(35, 1),
      guaranteedProfit: fraction(15, 1),
      roi: fraction(3, 7),
    });
  });

  it('rejects a non-positive existingStake', () => {
    expect(() =>
      calculateHedgeStake(ZERO, fraction(5, 1), fraction(2, 1)),
    ).toThrow(RangeError);
    expect(() =>
      calculateHedgeStake(fraction(-1, 1), fraction(5, 1), fraction(2, 1)),
    ).toThrow(RangeError);
  });

  it('rejects odds not greater than 1', () => {
    expect(() =>
      calculateHedgeStake(fraction(10, 1), ONE, fraction(2, 1)),
    ).toThrow(RangeError);
    expect(() =>
      calculateHedgeStake(fraction(10, 1), fraction(5, 1), ONE),
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

  it('profit is identical whichever side wins', () => {
    fc.assert(
      fc.property(
        stakeArb,
        oddsArb,
        oddsArb,
        (existingStake, existingOdds, hedgeOdds) => {
          const { hedgeStake } = calculateHedgeStake(
            existingStake,
            existingOdds,
            hedgeOdds,
          );
          const profitIfOriginalWins = subtractFractions(
            multiplyFractions(
              existingStake,
              subtractFractions(existingOdds, ONE),
            ),
            hedgeStake,
          );
          const profitIfHedgeWins = subtractFractions(
            multiplyFractions(hedgeStake, subtractFractions(hedgeOdds, ONE)),
            existingStake,
          );
          expect(profitIfOriginalWins).toEqual(profitIfHedgeWins);
        },
      ),
    );
  });

  it('totalStaked and roi are always exactly consistent with the other fields', () => {
    fc.assert(
      fc.property(
        stakeArb,
        oddsArb,
        oddsArb,
        (existingStake, existingOdds, hedgeOdds) => {
          const result = calculateHedgeStake(
            existingStake,
            existingOdds,
            hedgeOdds,
          );
          expect(result.totalStaked).toEqual(
            addFractions(existingStake, result.hedgeStake),
          );
          expect(result.roi).toEqual(
            divideFractions(result.guaranteedProfit, result.totalStaked),
          );
        },
      ),
    );
  });
});

describe('calculateExchangeLayStake', () => {
  it('is a break-even qualifying bet at matching odds and zero commission', () => {
    const result = calculateExchangeLayStake(
      fraction(10, 1),
      fraction(5, 1),
      fraction(5, 1),
      ZERO,
    );

    expect(result).toEqual({
      layStake: fraction(10, 1),
      liability: fraction(40, 1),
      guaranteedProfit: ZERO,
    });
  });

  it('costs a small guaranteed amount once commission is applied', () => {
    const result = calculateExchangeLayStake(
      fraction(10, 1),
      fraction(5, 1),
      fraction(5, 1),
      fraction(1, 20), // 5%
    );

    expect(result.layStake).toEqual(fraction(1_000, 99));
    expect(result.guaranteedProfit).toEqual(fraction(-40, 99));
  });

  it('rejects a non-positive existingStake', () => {
    expect(() =>
      calculateExchangeLayStake(ZERO, fraction(5, 1), fraction(5, 1), ZERO),
    ).toThrow(RangeError);
  });

  it('rejects odds not greater than 1', () => {
    expect(() =>
      calculateExchangeLayStake(fraction(10, 1), ONE, fraction(5, 1), ZERO),
    ).toThrow(RangeError);
    expect(() =>
      calculateExchangeLayStake(fraction(10, 1), fraction(5, 1), ONE, ZERO),
    ).toThrow(RangeError);
  });

  it('rejects a commission outside [0, 1)', () => {
    expect(() =>
      calculateExchangeLayStake(
        fraction(10, 1),
        fraction(5, 1),
        fraction(5, 1),
        fraction(-1, 100),
      ),
    ).toThrow(RangeError);
    expect(() =>
      calculateExchangeLayStake(
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
        (existingStake, existingOdds, layOdds, commission) => {
          const { layStake, guaranteedProfit } = calculateExchangeLayStake(
            existingStake,
            existingOdds,
            layOdds,
            commission,
          );
          const profitIfBackWins = subtractFractions(
            multiplyFractions(
              existingStake,
              subtractFractions(existingOdds, ONE),
            ),
            multiplyFractions(layStake, subtractFractions(layOdds, ONE)),
          );
          const profitIfLayWins = subtractFractions(
            multiplyFractions(layStake, subtractFractions(ONE, commission)),
            existingStake,
          );
          expect(profitIfBackWins).toEqual(profitIfLayWins);
          expect(guaranteedProfit).toEqual(profitIfBackWins);
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
        commissionArb,
        (existingStake, existingOdds, layOdds, commission) => {
          const result = calculateExchangeLayStake(
            existingStake,
            existingOdds,
            layOdds,
            commission,
          );
          expect(result.liability).toEqual(
            multiplyFractions(result.layStake, subtractFractions(layOdds, ONE)),
          );
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
        (existingStake, existingOdds, layOdds) => {
          const lower = calculateExchangeLayStake(
            existingStake,
            existingOdds,
            layOdds,
            fraction(1, 100),
          );
          const higher = calculateExchangeLayStake(
            existingStake,
            existingOdds,
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
