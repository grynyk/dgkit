import {
  addFractions,
  multiplyFractions,
  ONE,
  subtractFractions,
  ZERO,
  type Fraction,
} from './fraction';
import { requireNonNegative } from './lay-stake.utils';
import {
  calculateParlayExpectedValue,
  type ParlayLeg,
  type ParlayPrice,
} from './parlay';

/**
 * Accumulator ("acca") insurance expected value — the promo where a
 * bookmaker refunds the stake (often as free-bet credit) if only a limited
 * number of legs let a parlay down, rather than requiring every leg to
 * win.
 *
 * Computes each loss-count's exact probability via the standard
 * Poisson-binomial recurrence (independent, non-identically-distributed
 * Bernoulli trials) — the same independence assumption `parlay.ts`
 * documents; correlated legs aren't modeled.
 *
 * The refund's cash value is always a caller-supplied `refundValue`, not
 * computed here — pass `stake` directly for a cash-refund promo, or
 * `calculateFreeBetLayStake(...).guaranteedProfit` (`free-bet.ts`) for a
 * free-bet-credit refund, since that's already this package's answer for
 * what a stake-not-returned free bet is worth in cash.
 */

/**
 * `distribution[j]` is the probability that exactly `j` of `legs` lose,
 * for `j` in `[0, maxLosses]` — truncated there because insurance only
 * ever cares about loss counts up to `maxInsuredLosses`.
 *
 * Standard Poisson-binomial recurrence, processing one leg at a time:
 * `P(j losses among the first i legs) = P(j | i−1)×winProbability_i +
 * P(j−1 | i−1)×loseProbability_i`. Truncating each step's array at
 * `maxLosses + 1` entries keeps this `O(legs.length × maxLosses)` instead
 * of enumerating all `2^legs.length` loss combinations — the truncated
 * entries are never read back, so dropping them doesn't change any
 * `distribution[j]` for `j <= maxLosses`.
 *
 * `width <= distribution.length + 1` always, so `distribution[j - 1]` (`j`
 * ranging up to `width - 1`) is always in bounds; only `distribution[j]`
 * itself can run one past the previous step's array, at the still-growing
 * boundary `j === distribution.length`.
 */
function lossProbabilityDistribution(
  legs: readonly ParlayLeg[],
  maxLosses: number,
): readonly Fraction[] {
  let distribution: readonly Fraction[] = [ONE];
  for (const leg of legs) {
    const loseProbability = subtractFractions(ONE, leg.trueProbability);
    const width = Math.min(distribution.length + 1, maxLosses + 1);
    const next: Fraction[] = [];
    for (let j = 0; j < width; j += 1) {
      const staysWinning = multiplyFractions(
        distribution[j] ?? ZERO,
        leg.trueProbability,
      );
      const newlyLosing =
        j > 0 ? multiplyFractions(distribution[j - 1], loseProbability) : ZERO;
      next.push(addFractions(staysWinning, newlyLosing));
    }
    distribution = next;
  }
  return distribution;
}

/** The result of {@link calculateAccaInsuranceExpectedValue}. */
export interface AccaInsuranceResult {
  readonly price: ParlayPrice;
  /** Probability every leg wins outright — no insurance needed. */
  readonly winProbability: Fraction;
  /** Probability between 1 and `maxInsuredLosses` legs lose, triggering the refund. */
  readonly insuranceProbability: Fraction;
  readonly expectedValue: Fraction;
}

/**
 * The expected value of a parlay backed by "acca insurance" — a refund,
 * worth `refundValue` in cash, if between `1` and `maxInsuredLosses` legs
 * lose (and every other leg wins).
 *
 * ```ts
 * const leg = { trueProbability: fraction(3, 5), decimalOdds: fraction(2, 1) };
 * calculateAccaInsuranceExpectedValue(
 *   [leg, leg, leg],
 *   fraction(100, 1),
 *   1,
 *   fraction(80, 1), // e.g. an 80%-extraction free-bet refund of the $100 stake
 * );
 * // price { probability: 27/125, odds: 8 }, insuranceProbability 54/125, expectedValue 2684/25 (107.36)
 * ```
 *
 * Delegates to `parlay.ts`'s `calculateParlayExpectedValue` for the
 * combined price and the plain (uninsured) expected value, then adds the
 * insurance term: `expectedValue = parlayExpectedValue + insuranceProbability
 * × refundValue`. At `maxInsuredLosses = 0` this is exactly
 * `calculateParlayExpectedValue`'s expected value, since
 * `insuranceProbability` is `0`.
 *
 * Throws under the same conditions as `combineParlayLegs`, plus if `stake`
 * isn't positive, `maxInsuredLosses` isn't an integer in `[0, legs.length)`,
 * or `refundValue` is negative.
 */
export function calculateAccaInsuranceExpectedValue(
  legs: readonly ParlayLeg[],
  stake: Fraction,
  maxInsuredLosses: number,
  refundValue: Fraction,
): AccaInsuranceResult {
  if (
    !Number.isInteger(maxInsuredLosses) ||
    maxInsuredLosses < 0 ||
    maxInsuredLosses >= legs.length
  ) {
    throw new RangeError(
      `calculateAccaInsuranceExpectedValue: maxInsuredLosses must be an integer in [0, ${legs.length}), got ${maxInsuredLosses}.`,
    );
  }
  requireNonNegative(
    refundValue,
    'refundValue',
    'calculateAccaInsuranceExpectedValue',
  );

  const parlayEv = calculateParlayExpectedValue(legs, stake);

  // maxInsuredLosses < legs.length (checked above), so the distribution's
  // length is exactly maxInsuredLosses + 1 — every distribution[k] below is
  // in bounds.
  const distribution = lossProbabilityDistribution(legs, maxInsuredLosses);
  let insuranceProbability = ZERO;
  for (let k = 1; k <= maxInsuredLosses; k += 1) {
    insuranceProbability = addFractions(insuranceProbability, distribution[k]);
  }

  return {
    price: parlayEv.price,
    winProbability: parlayEv.price.probability,
    insuranceProbability,
    expectedValue: addFractions(
      parlayEv.expectedValue,
      multiplyFractions(insuranceProbability, refundValue),
    ),
  };
}
