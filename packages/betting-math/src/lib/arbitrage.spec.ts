import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  calculateArbitrageStakes,
  detectArbitrage,
  type ArbitrageResult,
} from './arbitrage';
import {
  addFractions,
  compareFractions,
  fraction,
  ZERO,
  type Fraction,
} from './fraction';
import { calculateOverround } from './market';

describe('detectArbitrage', () => {
  it('is true when implied probabilities sum to less than 1', () => {
    expect(detectArbitrage([fraction(2, 1), fraction(5, 2)])).toBe(true);
  });

  it('is false for a standard vig-laden market', () => {
    expect(detectArbitrage([fraction(191, 100), fraction(191, 100)])).toBe(
      false,
    );
  });

  it('is false for a perfectly fair (break-even) market', () => {
    expect(detectArbitrage([fraction(2, 1), fraction(2, 1)])).toBe(false);
  });

  it('throws on an empty market', () => {
    expect(() => detectArbitrage([])).toThrow(RangeError);
  });
});

describe('calculateArbitrageStakes', () => {
  it('splits a genuine two-way arbitrage into an exact guaranteed profit', () => {
    const result = calculateArbitrageStakes(
      [fraction(2, 1), fraction(5, 2)],
      fraction(100, 1),
    );

    expect(result.lines).toEqual([
      {
        odds: fraction(2, 1),
        stake: fraction(500, 9),
        returned: fraction(1000, 9),
      },
      {
        odds: fraction(5, 2),
        stake: fraction(400, 9),
        returned: fraction(1000, 9),
      },
    ]);
    expect(result.totalStaked).toEqual(fraction(100, 1));
    expect(result.guaranteedProfit).toEqual(fraction(100, 9));
    expect(result.roi).toEqual(fraction(1, 9));
    expect(result.isArbitrage).toBe(true);
  });

  it('still computes a stake split for a non-arbitrage market, with negative roi', () => {
    const result = calculateArbitrageStakes(
      [fraction(191, 100), fraction(191, 100)],
      fraction(100, 1),
    );

    expect(result.guaranteedProfit).toEqual(fraction(-9, 2));
    expect(result.roi).toEqual(fraction(-9, 200));
    expect(result.isArbitrage).toBe(false);
  });

  it('handles a three-way arbitrage', () => {
    // Implied probabilities 1/3, 1/3, 2/7 -> sum 20/21 < 1.
    const result = calculateArbitrageStakes(
      [fraction(3, 1), fraction(3, 1), fraction(7, 2)],
      fraction(210, 1),
    );

    expect(result.roi).toEqual(fraction(1, 20));
    expect(result.isArbitrage).toBe(true);
    const [a, b, c] = result.lines;
    expect(a.returned).toEqual(b.returned);
    expect(b.returned).toEqual(c.returned);
  });

  it('rejects a non-positive totalStake', () => {
    expect(() =>
      calculateArbitrageStakes([fraction(2, 1), fraction(2, 1)], ZERO),
    ).toThrow(RangeError);
    expect(() =>
      calculateArbitrageStakes(
        [fraction(2, 1), fraction(2, 1)],
        fraction(-1, 1),
      ),
    ).toThrow(RangeError);
  });

  it('rejects an empty market or odds not greater than 1', () => {
    expect(() => calculateArbitrageStakes([], fraction(100, 1))).toThrow(
      RangeError,
    );
    expect(() =>
      calculateArbitrageStakes([fraction(1, 1)], fraction(100, 1)),
    ).toThrow(RangeError);
  });

  /** Odds strictly greater than 1, generated from a bounded integer pair. */
  const oddsArb: fc.Arbitrary<Fraction> = fc
    .tuple(
      fc.integer({ min: 1, max: 100_000 }),
      fc.integer({ min: 1, max: 1_000 }),
    )
    // odds = 1 + a/b, guaranteed > 1 regardless of a and b.
    .map(([a, b]) => fraction(a + b, b));

  const marketArb = fc.array(oddsArb, { minLength: 1, maxLength: 8 });
  const stakeArb = fc
    .integer({ min: 1, max: 1_000_000 })
    .map((n) => fraction(n, 1));

  it('every line returns exactly the same amount, arbitrage or not', () => {
    fc.assert(
      fc.property(marketArb, stakeArb, (marketOdds, totalStake) => {
        const { lines } = calculateArbitrageStakes(marketOdds, totalStake);
        const first = lines[0].returned;
        for (const line of lines) {
          expect(line.returned).toEqual(first);
        }
      }),
    );
  });

  it('stakes always sum to exactly totalStake', () => {
    fc.assert(
      fc.property(marketArb, stakeArb, (marketOdds, totalStake) => {
        const { lines } = calculateArbitrageStakes(marketOdds, totalStake);
        const summedStake = lines.reduce(
          (sum, line) => addFractions(sum, line.stake),
          ZERO,
        );
        expect(summedStake).toEqual(totalStake);
      }),
    );
  });

  it('isArbitrage always agrees with calculateOverround being negative', () => {
    fc.assert(
      fc.property(marketArb, stakeArb, (marketOdds, totalStake) => {
        const result: ArbitrageResult = calculateArbitrageStakes(
          marketOdds,
          totalStake,
        );
        const overroundIsNegative =
          compareFractions(calculateOverround(marketOdds), ZERO) < 0;
        expect(result.isArbitrage).toBe(overroundIsNegative);
        expect(detectArbitrage(marketOdds)).toBe(overroundIsNegative);
      }),
    );
  });

  it('guaranteedProfit sign always matches isArbitrage', () => {
    fc.assert(
      fc.property(marketArb, stakeArb, (marketOdds, totalStake) => {
        const { guaranteedProfit, isArbitrage } = calculateArbitrageStakes(
          marketOdds,
          totalStake,
        );
        expect(compareFractions(guaranteedProfit, ZERO) > 0).toBe(isArbitrage);
      }),
    );
  });
});
