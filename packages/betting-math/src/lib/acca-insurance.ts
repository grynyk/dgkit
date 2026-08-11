import { generateCombinations } from './combinations';
import {
  addFractions,
  multiplyFractions,
  ONE,
  subtractFractions,
  ZERO,
  type Fraction,
} from './fraction';
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
 * Computes each loss-count's exact probability via
 * {@link generateCombinations} (`combinations.ts`) over which legs could be
 * the losers, assuming independence — the same assumption `parlay.ts`
 * documents; correlated legs aren't modeled.
 *
 * The refund's cash value is always a caller-supplied `refundValue`, not
 * computed here — pass `stake` directly for a cash-refund promo, or
 * `calculateFreeBetLayStake(...).guaranteedProfit` (`free-bet.ts`) for a
 * free-bet-credit refund, since that's already this package's answer for
 * what a stake-not-returned free bet is worth in cash.
 */

function probabilityOfExactlyKLosses(
  legs: readonly ParlayLeg[],
  k: number,
): Fraction {
  const losingCombinations = generateCombinations(
    legs.map((_, index) => index),
    k,
  );
  return losingCombinations.reduce((sum, losingIndices) => {
    const losingSet = new Set(losingIndices);
    const combinationProbability = legs.reduce(
      (product, leg, index) =>
        multiplyFractions(
          product,
          losingSet.has(index)
            ? subtractFractions(ONE, leg.trueProbability)
            : leg.trueProbability,
        ),
      ONE,
    );
    return addFractions(sum, combinationProbability);
  }, ZERO);
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
 * isn't positive, or `maxInsuredLosses` isn't an integer in
 * `[0, legs.length)`.
 */
export function calculateAccaInsuranceExpectedValue(
  legs: readonly ParlayLeg[],
  stake: Fraction,
  maxInsuredLosses: number,
  refundValue: Fraction,
): AccaInsuranceResult {
  const parlayEv = calculateParlayExpectedValue(legs, stake);
  if (
    !Number.isInteger(maxInsuredLosses) ||
    maxInsuredLosses < 0 ||
    maxInsuredLosses >= legs.length
  ) {
    throw new RangeError(
      `calculateAccaInsuranceExpectedValue: maxInsuredLosses must be an integer in [0, ${legs.length}), got ${maxInsuredLosses}.`,
    );
  }

  let insuranceProbability = ZERO;
  for (let k = 1; k <= maxInsuredLosses; k += 1) {
    insuranceProbability = addFractions(
      insuranceProbability,
      probabilityOfExactlyKLosses(legs, k),
    );
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
