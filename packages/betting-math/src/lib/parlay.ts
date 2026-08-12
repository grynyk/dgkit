import {
  calculateExpectedValue,
  type ExpectedValueResult,
} from './expected-value';
import { multiplyFractions, ONE, type Fraction } from './fraction';
import { calculateKellyStake, type KellyResult } from './kelly';
import { requireDecimalOdds, requireTrueProbability } from './lay-stake.utils';

/**
 * Parlay (accumulator) expected value and Kelly staking — the same
 * edge/staking math as `expected-value.ts`/`kelly.ts`, applied to a
 * multi-leg bet by first collapsing it to a single equivalent probability
 * and price.
 *
 * **Assumes independence.** The combined probability is the product of
 * every leg's `trueProbability` — exact only if the legs' outcomes don't
 * influence one another. Same-game legs (e.g. two player props from the
 * same match) are typically correlated, and this package does no
 * correlation modeling — if you have a correlation-adjusted estimate, fold
 * it into the `trueProbability` you supply per leg yourself.
 *
 * A real edge compounds multiplicatively across legs, not additively: three
 * independent legs each with a 20% edge compound to a 72.8% parlay edge
 * (see {@link calculateParlayExpectedValue}'s JSDoc) — small per-leg edges
 * add up fast in parlay form, which is part of why parlays are both
 * attractive and high-variance.
 */

/** One leg of a parlay, for {@link combineParlayLegs}. */
export interface ParlayLeg {
  readonly trueProbability: Fraction;
  readonly decimalOdds: Fraction;
}

/** The result of {@link combineParlayLegs}. */
export interface ParlayPrice {
  /** Product of every leg's `trueProbability` — the combined win chance, assuming independence. */
  readonly probability: Fraction;
  /** Product of every leg's `decimalOdds` — the combined parlay price. */
  readonly odds: Fraction;
}

function validateLeg(leg: ParlayLeg, index: number): void {
  requireTrueProbability(
    leg.trueProbability,
    `leg ${index}'s trueProbability`,
    'combineParlayLegs',
  );
  requireDecimalOdds(
    leg.decimalOdds,
    `leg ${index}'s decimalOdds`,
    'combineParlayLegs',
  );
}

/**
 * Collapse a parlay's legs into a single equivalent probability and price —
 * the same "multiply the odds across legs" this package's settlement
 * engine already does (see `settlement.utils.ts`'s odds product),
 * extended to also combine each leg's true probability.
 *
 * ```ts
 * combineParlayLegs([
 *   { trueProbability: fraction(3, 5), decimalOdds: fraction(2, 1) },
 *   { trueProbability: fraction(3, 5), decimalOdds: fraction(2, 1) },
 *   { trueProbability: fraction(3, 5), decimalOdds: fraction(2, 1) },
 * ]);
 * // { probability: 27/125, odds: 8 } — a treble at those three legs
 * ```
 *
 * A single leg degenerates to exactly that leg's own probability and odds.
 * Throws if `legs` is empty, if any leg's `trueProbability` isn't in
 * `(0, 1]`, or if any leg's `decimalOdds` isn't greater than `1`.
 */
export function combineParlayLegs(legs: readonly ParlayLeg[]): ParlayPrice {
  if (legs.length === 0) {
    throw new RangeError('combineParlayLegs: legs must not be empty.');
  }
  let probability = ONE;
  let odds = ONE;
  legs.forEach((leg, index) => {
    validateLeg(leg, index);
    probability = multiplyFractions(probability, leg.trueProbability);
    odds = multiplyFractions(odds, leg.decimalOdds);
  });
  return { probability, odds };
}

/** The result of {@link calculateParlayExpectedValue}. */
export interface ParlayExpectedValueResult extends ExpectedValueResult {
  readonly price: ParlayPrice;
}

/**
 * The expected value of staking `stake` on a parlay, given each leg's true
 * win probability and price.
 *
 * ```ts
 * calculateParlayExpectedValue(
 *   [
 *     { trueProbability: fraction(3, 5), decimalOdds: fraction(2, 1) },
 *     { trueProbability: fraction(3, 5), decimalOdds: fraction(2, 1) },
 *     { trueProbability: fraction(3, 5), decimalOdds: fraction(2, 1) },
 *   ],
 *   fraction(100, 1),
 * );
 * // price { probability: 27/125, odds: 8 }, edge 91/125 (72.8%), expectedValue 72.8
 * ```
 *
 * Combines legs via {@link combineParlayLegs}, then delegates to
 * `expected-value.ts`'s `calculateExpectedValue` on the combined
 * probability and price — a parlay's expected value is exactly a single
 * bet's expected value at its combined price. Throws under the same
 * conditions as {@link combineParlayLegs}, plus if `stake` isn't positive.
 */
export function calculateParlayExpectedValue(
  legs: readonly ParlayLeg[],
  stake: Fraction,
): ParlayExpectedValueResult {
  const price = combineParlayLegs(legs);
  return {
    ...calculateExpectedValue(price.probability, price.odds, stake),
    price,
  };
}

/** The result of {@link calculateParlayKellyStake}. */
export interface ParlayKellyResult extends KellyResult {
  readonly price: ParlayPrice;
}

/**
 * The Kelly-optimal stake for a parlay, given each leg's true win
 * probability and price, and a bankroll.
 *
 * ```ts
 * calculateParlayKellyStake(
 *   [
 *     { trueProbability: fraction(3, 5), decimalOdds: fraction(2, 1) },
 *     { trueProbability: fraction(3, 5), decimalOdds: fraction(2, 1) },
 *     { trueProbability: fraction(3, 5), decimalOdds: fraction(2, 1) },
 *   ],
 *   fraction(1_000, 1),
 * );
 * // price { probability: 27/125, odds: 8 }, fullKellyFraction 13/125 (10.4%), recommendedStake 104
 * ```
 *
 * Combines legs via {@link combineParlayLegs}, then delegates to
 * `kelly.ts`'s `calculateKellyStake` on the combined probability and
 * price, with the same `kellyFraction`/clamping behavior. Throws under the
 * same conditions as {@link combineParlayLegs}, plus if `bankroll` or
 * `kellyFraction` isn't positive.
 */
export function calculateParlayKellyStake(
  legs: readonly ParlayLeg[],
  bankroll: Fraction,
  kellyFraction: Fraction = ONE,
): ParlayKellyResult {
  const price = combineParlayLegs(legs);
  return {
    ...calculateKellyStake(
      price.probability,
      price.odds,
      bankroll,
      kellyFraction,
    ),
    price,
  };
}
