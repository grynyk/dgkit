import {
  addFractions,
  multiplyFractions,
  ONE,
  subtractFractions,
  type Fraction,
} from './fraction';

/**
 * Derive the place-part decimal odds for an each-way leg.
 *
 * ```ts
 * derivePlaceOdds(fraction(9, 1), fraction(1, 4)); // 3/1 — 9/1 at 1/4 odds
 * ```
 *
 * `placeOdds = 1 + (winOdds − 1) × placeFraction` — the standard "quarter
 * odds", "fifth odds", etc. terms bookmakers quote for each-way place parts.
 * This function only derives the odds; whether the place part of a
 * particular leg actually wins is a separate `LegStatus` the settlement
 * engine reads independently of the win status (see `settlement.types.ts`).
 */
export function derivePlaceOdds(
  winOdds: Fraction,
  placeFraction: Fraction,
): Fraction {
  const profit = subtractFractions(winOdds, ONE);
  return addFractions(ONE, multiplyFractions(profit, placeFraction));
}
