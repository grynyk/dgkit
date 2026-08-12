import {
  addFractions,
  divideFractions,
  minFraction,
  multiplyFractions,
  ONE,
  subtractFractions,
  type Fraction,
} from './fraction';
import {
  requireDecimalOdds,
  requireNonNegative,
  requirePositiveFraction,
} from './lay-stake.utils';

/**
 * Profit boost — a bookmaker token that increases a bet's *winnings* by a
 * percentage, not its stake return, optionally capped at a maximum extra
 * amount.
 *
 * `boostedOdds = 1 + (decimalOdds − 1) × (1 + boostPercent)`, before any
 * cap — capping the extra winnings a boost can add is equivalent to
 * capping `boostedOdds` itself, just expressed in currency instead of a
 * price.
 */

/** Input to {@link applyProfitBoost}. */
export interface ProfitBoostInput {
  readonly stake: Fraction;
  readonly decimalOdds: Fraction;
  /** e.g. `1/2` for a 50% profit boost. */
  readonly boostPercent: Fraction;
  /** Caps the extra winnings the boost adds; omit for an uncapped boost. */
  readonly maxBoostAmount?: Fraction;
}

/** The result of {@link applyProfitBoost}. */
export interface ProfitBoostResult {
  /** `stake × (decimalOdds − 1)` — the bet's ordinary, unboosted winnings. */
  readonly baseWinnings: Fraction;
  /** The extra winnings the boost adds, after any `maxBoostAmount` cap. */
  readonly boostAmount: Fraction;
  /** `stake + baseWinnings + boostAmount` — the total payout if the bet wins. */
  readonly boostedPayout: Fraction;
  /** `boostedPayout / stake` — the boost expressed as a single decimal price. */
  readonly boostedOdds: Fraction;
}

/**
 * Apply a profit boost to a bet, capping the extra winnings at
 * `maxBoostAmount` if supplied.
 *
 * ```ts
 * applyProfitBoost({
 *   stake: fraction(10, 1),
 *   decimalOdds: fraction(3, 1),
 *   boostPercent: fraction(1, 2), // 50%
 * });
 * // baseWinnings 20, boostAmount 10, boostedPayout 40, boostedOdds 4
 * ```
 *
 * Throws if `stake` isn't positive, `decimalOdds` isn't greater than `1`,
 * or `boostPercent`/`maxBoostAmount` is negative.
 */
export function applyProfitBoost(input: ProfitBoostInput): ProfitBoostResult {
  const { stake, decimalOdds, boostPercent, maxBoostAmount } = input;
  requirePositiveFraction(stake, 'stake', 'applyProfitBoost');
  requireDecimalOdds(decimalOdds, 'decimalOdds', 'applyProfitBoost');
  requireNonNegative(boostPercent, 'boostPercent', 'applyProfitBoost');
  if (maxBoostAmount !== undefined) {
    requireNonNegative(maxBoostAmount, 'maxBoostAmount', 'applyProfitBoost');
  }

  const baseWinnings = multiplyFractions(
    stake,
    subtractFractions(decimalOdds, ONE),
  );
  const uncappedBoostAmount = multiplyFractions(baseWinnings, boostPercent);
  const boostAmount =
    maxBoostAmount !== undefined
      ? minFraction(uncappedBoostAmount, maxBoostAmount)
      : uncappedBoostAmount;
  const boostedPayout = addFractions(
    addFractions(stake, baseWinnings),
    boostAmount,
  );

  return {
    baseWinnings,
    boostAmount,
    boostedPayout,
    boostedOdds: divideFractions(boostedPayout, stake),
  };
}
