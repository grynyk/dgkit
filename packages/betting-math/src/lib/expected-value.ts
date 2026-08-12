import {
  multiplyFractions,
  subtractFractions,
  ONE,
  type Fraction,
} from './fraction';
import {
  requireDecimalOdds,
  requirePositiveFraction,
  requireTrueProbability,
} from './lay-stake.utils';
import { impliedProbability } from './market';

/**
 * Expected value (EV) and edge — the gap between a bet's true win
 * probability and the probability the odds imply.
 *
 * `edge = trueProbability × decimalOdds − 1`. A positive edge means the
 * price is better than fair (the bettor's estimate of the true probability
 * exceeds the odds' {@link impliedProbability}); a negative edge means the
 * price is worse than fair. `expectedValue = stake × edge` is the average
 * profit per bet if `trueProbability` is accurate, over infinitely many
 * repetitions — a single bet still wins or loses in full, so a positive EV
 * describes a favorable long-run price, not a guaranteed outcome (unlike
 * {@link calculateArbitrageStakes}, which is guaranteed regardless of
 * `trueProbability`).
 */

/**
 * The edge of a single bet, per unit staked.
 *
 * ```ts
 * calculateEdge(fraction(3, 5), fraction(2, 1)); // 1/5 — a 60% true chance at even-money-plus odds
 * calculateEdge(fraction(2, 5), fraction(2, 1)); // -1/5 — a 40% true chance is a bad price at odds of 2
 * ```
 *
 * `edge = trueProbability × decimalOdds − 1`, exactly `0` when
 * `trueProbability` equals `decimalOdds`'s {@link impliedProbability} (a
 * perfectly fair price). Throws if `trueProbability` isn't in `(0, 1]`, or
 * `decimalOdds` isn't greater than `1`.
 */
export function calculateEdge(
  trueProbability: Fraction,
  decimalOdds: Fraction,
): Fraction {
  requireTrueProbability(trueProbability, 'trueProbability', 'calculateEdge');
  requireDecimalOdds(decimalOdds, 'decimalOdds', 'calculateEdge');
  return subtractFractions(
    multiplyFractions(trueProbability, decimalOdds),
    ONE,
  );
}

/** The result of {@link calculateExpectedValue}. */
export interface ExpectedValueResult {
  readonly stake: Fraction;
  /** `stake × edge`. */
  readonly expectedValue: Fraction;
  /** `trueProbability × decimalOdds − 1`, per unit staked. */
  readonly edge: Fraction;
  /** `1 / decimalOdds`, included for comparison against `trueProbability`. */
  readonly impliedProbability: Fraction;
}

/**
 * The expected value of staking `stake` on a bet, given its true win
 * probability and price.
 *
 * ```ts
 * calculateExpectedValue(fraction(3, 5), fraction(2, 1), fraction(100, 1));
 * // { expectedValue: 20, edge: 1/5, impliedProbability: 1/2, stake: 100 }
 * ```
 *
 * Throws under the same conditions as {@link calculateEdge}, plus if
 * `stake` isn't positive.
 */
export function calculateExpectedValue(
  trueProbability: Fraction,
  decimalOdds: Fraction,
  stake: Fraction,
): ExpectedValueResult {
  const edge = calculateEdge(trueProbability, decimalOdds);
  requirePositiveFraction(stake, 'stake', 'calculateExpectedValue');
  return {
    stake,
    expectedValue: multiplyFractions(stake, edge),
    edge,
    impliedProbability: impliedProbability(decimalOdds),
  };
}
