import {
  addFractions,
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
 * Hedging (green-up) — given a bet already placed, how much to stake on the
 * opposing outcome so profit is the same regardless of which side wins.
 *
 * Two shapes:
 * - {@link calculateHedgeStake} — a plain second back bet at another
 *   bookmaker, with the full stake at risk both ways. Same "stake × odds is
 *   equal across every winning leg" invariant as `arbitrage.ts`'s
 *   `calculateArbitrageStakes`, just anchored to an already-placed first leg
 *   instead of splitting a fresh total stake — a different unknown, so it
 *   isn't built as a call into that function.
 * - {@link calculateExchangeLayStake} — a lay bet on a betting exchange
 *   (e.g. Betfair), which charges `commission` on net lay winnings instead
 *   of risking a second full stake.
 */

/** The result of {@link calculateHedgeStake}. */
export interface HedgeResult {
  readonly hedgeStake: Fraction;
  readonly totalStaked: Fraction;
  /** The same regardless of which outcome happens. Negative if hedging costs money. */
  readonly guaranteedProfit: Fraction;
  /** `guaranteedProfit / totalStaked`. */
  readonly roi: Fraction;
}

/**
 * The stake on the opposing outcome, at `hedgeOdds`, that locks in an equal
 * profit whichever side wins.
 *
 * ```ts
 * calculateHedgeStake(fraction(10, 1), fraction(5, 1), fraction(2, 1));
 * // hedgeStake 25, guaranteedProfit 15 either way
 * ```
 *
 * `hedgeStake = existingStake × existingOdds / hedgeOdds` — solved from
 * setting `existingStake × (existingOdds − 1) − hedgeStake` (profit if the
 * original bet wins) equal to `hedgeStake × (hedgeOdds − 1) − existingStake`
 * (profit if the hedge wins), which reduces to `existingStake ×
 * existingOdds === hedgeStake × hedgeOdds`.
 *
 * Throws if `existingStake` isn't positive, or either odds isn't greater
 * than `1`.
 */
export function calculateHedgeStake(
  existingStake: Fraction,
  existingOdds: Fraction,
  hedgeOdds: Fraction,
): HedgeResult {
  requirePositiveFraction(
    existingStake,
    'existingStake',
    'calculateHedgeStake',
  );
  requireDecimalOdds(existingOdds, 'existingOdds', 'calculateHedgeStake');
  requireDecimalOdds(hedgeOdds, 'hedgeOdds', 'calculateHedgeStake');

  const guaranteedReturn = multiplyFractions(existingStake, existingOdds);
  const hedgeStake = divideFractions(guaranteedReturn, hedgeOdds);
  const totalStaked = addFractions(existingStake, hedgeStake);
  const guaranteedProfit = subtractFractions(guaranteedReturn, totalStaked);
  const roi = divideFractions(guaranteedProfit, totalStaked);

  return { hedgeStake, totalStaked, guaranteedProfit, roi };
}

/** The result of {@link calculateExchangeLayStake}. */
export interface ExchangeLayResult {
  readonly layStake: Fraction;
  /** The exchange balance needed to cover the lay bet if it loses. */
  readonly liability: Fraction;
  /** The same regardless of which side wins. */
  readonly guaranteedProfit: Fraction;
}

/**
 * The lay stake on a betting exchange that locks in equal profit whether
 * the existing back bet or the lay bet wins, accounting for the exchange's
 * commission on net lay winnings.
 *
 * ```ts
 * calculateExchangeLayStake(fraction(10, 1), fraction(5, 1), fraction(5, 1), ZERO);
 * // layStake 10, guaranteedProfit 0 — laying the same price with no
 * // commission is a break-even "qualifying bet", not a profit
 * ```
 *
 * **Not the same `guaranteedProfit` as {@link calculateHedgeStake}**, even
 * though both `layStake`/`hedgeStake` reduce to the same
 * `existingStake × existingOdds / odds` at `commission = 0` — a lay
 * liability and a second full back stake are different instruments: a lay
 * bet that wins pays `layStake × (1 − commission)`, not `layStake ×
 * (layOdds − 1)` the way a matching back bet nets after risking its own
 * stake.
 *
 * Throws if `existingStake` isn't positive, either odds isn't greater than
 * `1`, or `commission` isn't in `[0, 1)`.
 */
export function calculateExchangeLayStake(
  existingStake: Fraction,
  existingOdds: Fraction,
  layOdds: Fraction,
  commission: Fraction,
): ExchangeLayResult {
  requirePositiveFraction(
    existingStake,
    'existingStake',
    'calculateExchangeLayStake',
  );
  requireDecimalOdds(existingOdds, 'existingOdds', 'calculateExchangeLayStake');
  requireDecimalOdds(layOdds, 'layOdds', 'calculateExchangeLayStake');
  requireCommission(commission, 'calculateExchangeLayStake');

  const { layStake, guaranteedProfit } = solveEqualizingLayStake(
    existingStake,
    existingOdds,
    layOdds,
    commission,
    /* stakeAtRisk */ true,
  );

  return {
    layStake,
    liability: multiplyFractions(layStake, subtractFractions(layOdds, ONE)),
    guaranteedProfit,
  };
}
