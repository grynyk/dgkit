import {
  addFractions,
  fraction,
  fractionToNumber,
  multiplyFractions,
  ONE,
  subtractFractions,
  type Fraction,
} from './fraction';

/**
 * One band of a Rule 4 deduction scale: "a runner withdrawn at odds up to
 * `maxDecimalOdds` costs winning bets on the remaining runners
 * `deductionPence` pence in the pound."
 *
 * This package ships no default scale — Rule 4 deduction bands are
 * published per-bookmaker (they're all close to the common industry
 * scale, but not byte-identical), so a caller-supplied `table` is always
 * required rather than baking in one bookmaker's numbers as if they were
 * universal. See the README for where to source a current table.
 */
export interface Rule4Band {
  readonly maxDecimalOdds: number;
  readonly deductionPence: number;
}

/**
 * Look up the deduction (in pence per pound, `0`–`100`) for a runner
 * withdrawn at `withdrawnOdds`, against a Rule 4 `table`.
 *
 * `table` is scanned for the first band whose `maxDecimalOdds` is `>=`
 * `withdrawnOdds` — so `table` should be sorted ascending by
 * `maxDecimalOdds` (unsorted input is not detected or corrected). A price
 * beyond every band's `maxDecimalOdds` returns `0` (no deduction) — the
 * standard convention that big-priced withdrawals never trigger one.
 *
 * Throws if `table` is empty.
 */
export function lookupRule4Deduction(
  withdrawnOdds: Fraction,
  table: readonly Rule4Band[],
): number {
  if (table.length === 0) {
    throw new RangeError('lookupRule4Deduction: table must not be empty.');
  }
  const price = fractionToNumber(withdrawnOdds);
  const band = table.find((b) => b.maxDecimalOdds >= price);
  return band?.deductionPence ?? 0;
}

/**
 * Apply a Rule 4 deduction to decimal odds.
 *
 * ```ts
 * applyRule4Deduction(fraction(3, 1), 25); // odds cut from 3.0 to 2.5
 * ```
 *
 * `adjustedOdds = 1 + (odds − 1) × (1 − deductionPence / 100)` — the
 * deduction is taken from the *winnings* (the odds' profit component), never
 * from the stake, matching how Rule 4 is actually applied at settlement.
 * Deliberately an odds transform rather than a post-hoc money adjustment, so
 * it composes with dead-heat reduction and system-bet fold multiplication —
 * both of which also just multiply odds together.
 *
 * Throws if `deductionPence` is outside `[0, 100]`.
 */
export function applyRule4Deduction(
  odds: Fraction,
  deductionPence: number,
): Fraction {
  if (deductionPence < 0 || deductionPence > 100) {
    throw new RangeError(
      `applyRule4Deduction: deductionPence must be in [0, 100], got ${deductionPence}.`,
    );
  }
  const profit = subtractFractions(odds, ONE);
  const retainedFraction = subtractFractions(
    ONE,
    fraction(deductionPence, 100),
  );
  return addFractions(ONE, multiplyFractions(profit, retainedFraction));
}
