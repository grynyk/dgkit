import {
  addFractions,
  divideFractions,
  fraction,
  ONE,
  subtractFractions,
  type Fraction,
} from './fraction';

/**
 * Reduce decimal odds for a leg tied with other runners in a dead heat.
 *
 * ```ts
 * reduceDeadHeatOdds(fraction(3, 1), 2); // 2/1 — two runners dead heat for the win
 * ```
 *
 * Standard formula: `((odds − 1) / tiedCount) + 1` — the profit is divided
 * across the tied runners, then a unit stake is added back. This is applied
 * to the *odds*, not the returned money, so it composes cleanly with
 * everything downstream that multiplies leg odds together (system-bet folds,
 * Rule 4 deductions).
 *
 * Throws if `tiedCount` isn't an integer `>= 2` — a "dead heat" of fewer
 * than two runners isn't one.
 */
export function reduceDeadHeatOdds(
  odds: Fraction,
  tiedCount: number,
): Fraction {
  if (!Number.isInteger(tiedCount) || tiedCount < 2) {
    throw new RangeError(
      `reduceDeadHeatOdds: tiedCount must be an integer >= 2, got ${tiedCount}.`,
    );
  }
  const profit = subtractFractions(odds, ONE);
  return addFractions(ONE, divideFractions(profit, fraction(tiedCount)));
}
