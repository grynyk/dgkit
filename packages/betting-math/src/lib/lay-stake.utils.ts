import {
  addFractions,
  compareFractions,
  divideFractions,
  fractionToString,
  multiplyFractions,
  ONE,
  subtractFractions,
  ZERO,
  type Fraction,
} from './fraction';

/**
 * Shared algebra for `hedge.ts`'s `calculateExchangeLayStake` and
 * `free-bet.ts`'s `calculateFreeBetLayStake`: both solve for the lay stake
 * that equalizes profit between "the back bet wins" and "the lay bet wins",
 * on an exchange charging `commission` on net lay winnings. The only
 * difference between a cash back bet and a stake-not-returned (SNR) free
 * bet is whether the back stake itself is lost when the back bet loses —
 * captured here by `stakeAtRisk`.
 */

export function requirePositiveFraction(
  value: Fraction,
  name: string,
  context: string,
): void {
  if (compareFractions(value, ZERO) <= 0) {
    throw new RangeError(
      `${context}: ${name} must be > 0, got ${fractionToString(value)}.`,
    );
  }
}

export function requireDecimalOdds(
  value: Fraction,
  name: string,
  context: string,
): void {
  if (compareFractions(value, ONE) <= 0) {
    throw new RangeError(
      `${context}: ${name} must be greater than 1, got ${fractionToString(value)}.`,
    );
  }
}

export function requireCommission(value: Fraction, context: string): void {
  if (compareFractions(value, ZERO) < 0 || compareFractions(value, ONE) >= 0) {
    throw new RangeError(
      `${context}: commission must be in [0, 1), got ${fractionToString(value)}.`,
    );
  }
}

export interface EqualizingLayStakeResult {
  readonly layStake: Fraction;
  /** The same regardless of which side wins. */
  readonly guaranteedProfit: Fraction;
}

/**
 * Solve for the lay stake `L` (at `layOdds`, net of `commission`) that
 * makes profit identical whether the back bet or the lay bet wins.
 *
 * `stakeAtRisk = true` (a cash back bet):
 * ```
 * profit_if_back_wins = backStake×(backOdds−1) − L×(layOdds−1)
 * profit_if_lay_wins  = L×(1−commission) − backStake
 * ⇒ L = backStake × backOdds / (layOdds − commission)
 * ```
 *
 * `stakeAtRisk = false` (a stake-not-returned free bet — losing it costs
 * nothing, since it was never the bettor's money):
 * ```
 * profit_if_back_wins = backStake×(backOdds−1) − L×(layOdds−1)
 * profit_if_lay_wins  = L×(1−commission)
 * ⇒ L = backStake × (backOdds−1) / (layOdds − commission)
 * ```
 *
 * `layOdds − commission` is always `> 0` given `layOdds > 1` and
 * `commission` in `[0, 1)` — callers must validate both before calling this,
 * so no separate divide-by-zero guard is needed here.
 */
export function solveEqualizingLayStake(
  backStake: Fraction,
  backOdds: Fraction,
  layOdds: Fraction,
  commission: Fraction,
  stakeAtRisk: boolean,
): EqualizingLayStakeResult {
  const winnings = multiplyFractions(
    backStake,
    subtractFractions(backOdds, ONE),
  );
  const numerator = stakeAtRisk ? addFractions(winnings, backStake) : winnings;
  const layStake = divideFractions(
    numerator,
    subtractFractions(layOdds, commission),
  );
  const netLayWinnings = multiplyFractions(
    layStake,
    subtractFractions(ONE, commission),
  );
  const guaranteedProfit = stakeAtRisk
    ? subtractFractions(netLayWinnings, backStake)
    : netLayWinnings;

  return { layStake, guaranteedProfit };
}
