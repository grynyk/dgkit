import { calculateFreeBetLayStake } from './free-bet';
import {
  compareFractions,
  divideFractions,
  fractionToString,
  minFraction,
  multiplyFractions,
  subtractFractions,
  ZERO,
  type Fraction,
} from './fraction';
import {
  calculateLayLiability,
  requireCommission,
  requireDecimalOdds,
  requireNonNegative,
  requirePositiveFraction,
} from './lay-stake.utils';

/**
 * Risk-free bet — a bookmaker refunds the stake (usually as free-bet
 * credit, up to `refundCap`) if a *cash* qualifying bet loses, rather than
 * paying out only its winnings if it wins like a stake-not-returned free
 * bet (`free-bet.ts`).
 *
 * The refund's cash value is estimated the same way this package always
 * values an SNR free bet — via `free-bet.ts`'s `calculateFreeBetLayStake`
 * — so a risk-free bet is really an ordinary exchange-lay qualifying bet
 * (`hedge.ts`'s `calculateExchangeLayStake`) plus a second, smaller
 * free-bet conversion layered on the losing branch. Because that refund
 * has value even when the back bet loses, less needs to be laid to
 * equalize the two outcomes than a plain qualifying bet would need — at
 * `refundCap = 0` this reduces exactly to `calculateExchangeLayStake`.
 */

/** Input to {@link calculateRiskFreeBetLayStake}. */
export interface RiskFreeBetInput {
  readonly backStake: Fraction;
  readonly backOdds: Fraction;
  readonly layOdds: Fraction;
  readonly commission: Fraction;
  /** Maximum stake refunded (as free-bet credit) if the back bet loses. */
  readonly refundCap: Fraction;
  /** Odds available to re-back the refunded free-bet credit at. */
  readonly refundBackOdds: Fraction;
  readonly refundLayOdds: Fraction;
  readonly refundCommission: Fraction;
}

/** The result of {@link calculateRiskFreeBetLayStake}. */
export interface RiskFreeBetResult {
  readonly layStake: Fraction;
  /** The exchange balance needed to cover the lay bet if it loses. */
  readonly liability: Fraction;
  /** `min(backStake, refundCap)` — the free-bet credit issued if the back bet loses. */
  readonly refundAmount: Fraction;
  /** The refund's extractable cash value, via `calculateFreeBetLayStake`. */
  readonly refundValue: Fraction;
  /** The same regardless of which side wins. */
  readonly guaranteedProfit: Fraction;
}

/**
 * The lay stake that locks in equal profit whether a risk-free-backed bet
 * wins outright or loses and is refunded as free-bet credit up to
 * `refundCap`.
 *
 * ```ts
 * calculateRiskFreeBetLayStake({
 *   backStake: fraction(100, 1),
 *   backOdds: fraction(2, 1),
 *   layOdds: fraction(2, 1),
 *   commission: ZERO,
 *   refundCap: fraction(100, 1),
 *   refundBackOdds: fraction(5, 1),
 *   refundLayOdds: fraction(5, 1),
 *   refundCommission: ZERO,
 * });
 * // refundValue 80 (an 80%-extraction free bet), layStake 60, guaranteedProfit 40
 * // — versus $100 laid for exactly $0 profit on a plain qualifying bet with no refund
 * ```
 *
 * **Derivation.** With `L` the lay stake and `refundValue` the refund's
 * cash value:
 * ```
 * profit_if_back_wins = backStake×(backOdds−1) − L×(layOdds−1)
 * profit_if_lay_wins  = L×(1−commission) − backStake + refundValue
 * ```
 * Setting these equal and solving for `L` gives
 * `L = (backStake × backOdds − refundValue) / (layOdds − commission)` — the
 * same numerator as `calculateExchangeLayStake`'s, minus `refundValue`.
 *
 * Throws if `backStake` isn't positive, `backOdds`/`layOdds`/`refundBackOdds`/
 * `refundLayOdds` isn't greater than `1`, `commission`/`refundCommission`
 * isn't in `[0, 1)`, `refundCap` is negative, or the refund market is so
 * much more favorable than the qualifying bet's own odds that `refundValue`
 * would reach or exceed `backStake × backOdds` — at that point no positive
 * lay stake can equalize the outcomes.
 */
export function calculateRiskFreeBetLayStake(
  input: RiskFreeBetInput,
): RiskFreeBetResult {
  const {
    backStake,
    backOdds,
    layOdds,
    commission,
    refundCap,
    refundBackOdds,
    refundLayOdds,
    refundCommission,
  } = input;
  requirePositiveFraction(
    backStake,
    'backStake',
    'calculateRiskFreeBetLayStake',
  );
  requireDecimalOdds(backOdds, 'backOdds', 'calculateRiskFreeBetLayStake');
  requireDecimalOdds(layOdds, 'layOdds', 'calculateRiskFreeBetLayStake');
  requireCommission(commission, 'calculateRiskFreeBetLayStake');
  requireNonNegative(refundCap, 'refundCap', 'calculateRiskFreeBetLayStake');
  requireDecimalOdds(
    refundBackOdds,
    'refundBackOdds',
    'calculateRiskFreeBetLayStake',
  );
  requireDecimalOdds(
    refundLayOdds,
    'refundLayOdds',
    'calculateRiskFreeBetLayStake',
  );
  requireCommission(refundCommission, 'calculateRiskFreeBetLayStake');

  const refundAmount = minFraction(backStake, refundCap);
  const refundValue =
    compareFractions(refundAmount, ZERO) > 0
      ? calculateFreeBetLayStake(
          refundAmount,
          refundBackOdds,
          refundLayOdds,
          refundCommission,
        ).guaranteedProfit
      : ZERO;

  const backReturn = multiplyFractions(backStake, backOdds);
  if (compareFractions(backReturn, refundValue) <= 0) {
    throw new RangeError(
      `calculateRiskFreeBetLayStake: refundValue (${fractionToString(refundValue)}) must be less than backStake × backOdds (${fractionToString(backReturn)}) — the refund market is too favorable relative to the qualifying bet's own odds for any positive lay stake to equalize the outcomes.`,
    );
  }

  const layStake = divideFractions(
    subtractFractions(backReturn, refundValue),
    subtractFractions(layOdds, commission),
  );
  const liability = calculateLayLiability(layStake, layOdds);
  const guaranteedProfit = subtractFractions(
    subtractFractions(backReturn, backStake),
    liability,
  );

  return {
    layStake,
    liability,
    refundAmount,
    refundValue,
    guaranteedProfit,
  };
}
