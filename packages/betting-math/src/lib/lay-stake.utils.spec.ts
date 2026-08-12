import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  compareFractions,
  fraction,
  multiplyFractions,
  ONE,
  subtractFractions,
  ZERO,
  type Fraction,
} from './fraction';
import {
  calculateLayLiability,
  requireCommission,
  requireDecimalOdds,
  requireNonNegative,
  requirePositiveFraction,
  requireTrueProbability,
  solveEqualizingLayStake,
} from './lay-stake.utils';

describe('requirePositiveFraction', () => {
  it('throws for zero or negative values', () => {
    expect(() => requirePositiveFraction(ZERO, 'x', 'ctx')).toThrow(RangeError);
    expect(() => requirePositiveFraction(fraction(-1, 1), 'x', 'ctx')).toThrow(
      RangeError,
    );
  });

  it('does not throw for a positive value', () => {
    expect(() =>
      requirePositiveFraction(fraction(1, 100), 'x', 'ctx'),
    ).not.toThrow();
  });
});

describe('requireDecimalOdds', () => {
  it('throws for odds not greater than 1', () => {
    expect(() => requireDecimalOdds(fraction(1, 1), 'x', 'ctx')).toThrow(
      RangeError,
    );
    expect(() => requireDecimalOdds(fraction(1, 2), 'x', 'ctx')).toThrow(
      RangeError,
    );
  });

  it('does not throw for odds greater than 1', () => {
    expect(() => requireDecimalOdds(fraction(3, 2), 'x', 'ctx')).not.toThrow();
  });
});

describe('requireCommission', () => {
  it('accepts the boundary of 0', () => {
    expect(() => requireCommission(ZERO, 'ctx')).not.toThrow();
  });

  it('rejects a negative commission', () => {
    expect(() => requireCommission(fraction(-1, 100), 'ctx')).toThrow(
      RangeError,
    );
  });

  it('rejects a commission of 1 or more', () => {
    expect(() => requireCommission(fraction(1, 1), 'ctx')).toThrow(RangeError);
    expect(() => requireCommission(fraction(3, 2), 'ctx')).toThrow(RangeError);
  });
});

describe('requireNonNegative', () => {
  it('throws for a negative value', () => {
    expect(() => requireNonNegative(fraction(-1, 100), 'x', 'ctx')).toThrow(
      RangeError,
    );
  });

  it('accepts the boundary of 0', () => {
    expect(() => requireNonNegative(ZERO, 'x', 'ctx')).not.toThrow();
  });

  it('does not throw for a positive value', () => {
    expect(() =>
      requireNonNegative(fraction(1, 100), 'x', 'ctx'),
    ).not.toThrow();
  });
});

describe('requireTrueProbability', () => {
  it('throws for zero or negative values', () => {
    expect(() => requireTrueProbability(ZERO, 'x', 'ctx')).toThrow(RangeError);
    expect(() => requireTrueProbability(fraction(-1, 2), 'x', 'ctx')).toThrow(
      RangeError,
    );
  });

  it('throws above the upper boundary of 1', () => {
    expect(() => requireTrueProbability(fraction(3, 2), 'x', 'ctx')).toThrow(
      RangeError,
    );
  });

  it('accepts the boundary of 1', () => {
    expect(() => requireTrueProbability(ONE, 'x', 'ctx')).not.toThrow();
  });

  it('does not throw for a value strictly inside (0, 1)', () => {
    expect(() =>
      requireTrueProbability(fraction(1, 2), 'x', 'ctx'),
    ).not.toThrow();
  });
});

describe('calculateLayLiability', () => {
  it('is layStake × (layOdds − 1)', () => {
    expect(calculateLayLiability(fraction(10, 1), fraction(5, 1))).toEqual(
      fraction(40, 1),
    );
  });

  it('is zero for a zero layStake', () => {
    expect(calculateLayLiability(ZERO, fraction(5, 1))).toEqual(ZERO);
  });
});

describe('solveEqualizingLayStake', () => {
  it('stakeAtRisk=true: a break-even qualifying bet at matching odds and zero commission', () => {
    const result = solveEqualizingLayStake(
      fraction(10, 1),
      fraction(5, 1),
      fraction(5, 1),
      ZERO,
      true,
    );
    expect(result).toEqual({
      layStake: fraction(10, 1),
      guaranteedProfit: ZERO,
    });
  });

  it('stakeAtRisk=false: an 80% extraction at matching odds and zero commission', () => {
    const result = solveEqualizingLayStake(
      fraction(10, 1),
      fraction(5, 1),
      fraction(5, 1),
      ZERO,
      false,
    );
    expect(result).toEqual({
      layStake: fraction(8, 1),
      guaranteedProfit: fraction(8, 1),
    });
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

  it.each([true, false])(
    'equalizes profit between both outcomes when stakeAtRisk=%s',
    (stakeAtRisk) => {
      fc.assert(
        fc.property(
          stakeArb,
          oddsArb,
          oddsArb,
          commissionArb,
          (backStake, backOdds, layOdds, commission) => {
            const { layStake, guaranteedProfit } = solveEqualizingLayStake(
              backStake,
              backOdds,
              layOdds,
              commission,
              stakeAtRisk,
            );

            const winnings = multiplyFractions(
              backStake,
              subtractFractions(backOdds, ONE),
            );
            const layPayout = multiplyFractions(
              layStake,
              subtractFractions(layOdds, ONE),
            );
            const profitIfBackWins = subtractFractions(winnings, layPayout);

            const netLayWinnings = multiplyFractions(
              layStake,
              subtractFractions(ONE, commission),
            );
            const profitIfLayWins = stakeAtRisk
              ? subtractFractions(netLayWinnings, backStake)
              : netLayWinnings;

            expect(profitIfBackWins).toEqual(profitIfLayWins);
            expect(guaranteedProfit).toEqual(profitIfBackWins);
            expect(compareFractions(layStake, ZERO)).toBeGreaterThan(0);
          },
        ),
      );
    },
  );
});
