import {
  divideFractions,
  multiplyFractions,
  subtractFractions,
  ONE,
  type Fraction,
} from './fraction';
import {
  requireCommission,
  requireDecimalOdds,
  requirePositiveFraction,
  solveEqualizingLayStake,
} from './lay-stake.utils';

/**
 * Matched-betting free-bet (stake-not-returned, SNR) extraction.
 *
 * A free bet pays out only its winnings if it wins — the stake itself was
 * never the bettor's money, so it's never returned — and costs nothing if
 * it loses, unlike a cash bet. Laying the free-bet selection on an exchange
 * converts that conditional value into a guaranteed cash profit, typically
 * 70-80% of the free bet's face value rather than the ~95%+ achievable by
 * matching a cash qualifying bet (see `hedge.ts`'s
 * `calculateExchangeLayStake`), because the lay stake here only has to
 * cover winnings, not stake-plus-winnings.
 */

/** The result of {@link calculateFreeBetLayStake}. */
export interface FreeBetLayResult {
  readonly layStake: Fraction;
  /** The exchange balance needed to cover the lay bet if it loses. */
  readonly liability: Fraction;
  /** The same regardless of which side wins. */
  readonly guaranteedProfit: Fraction;
  /** `guaranteedProfit / freeBetStake` — the fraction of face value extracted. */
  readonly extractionRate: Fraction;
}

/**
 * The lay stake that extracts a guaranteed cash profit from a stake-not-
 * returned free bet, regardless of which side wins.
 *
 * ```ts
 * calculateFreeBetLayStake(fraction(10, 1), fraction(5, 1), fraction(5, 1), ZERO);
 * // layStake 8, guaranteedProfit 8, extractionRate 4/5 (80%)
 * ```
 *
 * `layStake = freeBetStake × (backOdds − 1) / (layOdds − commission)` —
 * solved from setting `freeBetStake × (backOdds − 1) − layStake ×
 * (layOdds − 1)` (profit if the free bet wins) equal to `layStake ×
 * (1 − commission)` (profit if the lay wins; the free bet stake is never at
 * risk, so losing it costs nothing).
 *
 * Throws if `freeBetStake` isn't positive, either odds isn't greater than
 * `1`, or `commission` isn't in `[0, 1)`.
 */
export function calculateFreeBetLayStake(
  freeBetStake: Fraction,
  backOdds: Fraction,
  layOdds: Fraction,
  commission: Fraction,
): FreeBetLayResult {
  requirePositiveFraction(
    freeBetStake,
    'freeBetStake',
    'calculateFreeBetLayStake',
  );
  requireDecimalOdds(backOdds, 'backOdds', 'calculateFreeBetLayStake');
  requireDecimalOdds(layOdds, 'layOdds', 'calculateFreeBetLayStake');
  requireCommission(commission, 'calculateFreeBetLayStake');

  const { layStake, guaranteedProfit } = solveEqualizingLayStake(
    freeBetStake,
    backOdds,
    layOdds,
    commission,
    /* stakeAtRisk */ false,
  );

  return {
    layStake,
    liability: multiplyFractions(layStake, subtractFractions(layOdds, ONE)),
    guaranteedProfit,
    extractionRate: divideFractions(guaranteedProfit, freeBetStake),
  };
}
