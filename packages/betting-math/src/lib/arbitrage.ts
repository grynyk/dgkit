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
import { impliedProbability } from './market';

/**
 * Cross-book arbitrage (surebet) detection and stake-splitting.
 *
 * An arbitrage exists when the best available odds for every outcome of a
 * market — taken from one bookmaker or several — imply probabilities that
 * sum to *less* than `1`, i.e. {@link calculateOverround} (`market.ts`) is
 * negative for that set of odds. Staking proportionally to each outcome's
 * implied probability then produces the **same guaranteed return no matter
 * which outcome happens** — and because every step here stays in exact
 * `Fraction` space, that equality is exact, not "close enough": two lines
 * that should return the identical amount return bit-for-bit the same
 * `Fraction`, never off by a rounding cent.
 *
 * {@link calculateArbitrageStakes} isn't limited to genuine arbitrage —
 * feed it a single bookmaker's own (vig-laden) market and it still computes
 * the equal-payout stake split, just with a negative `roi`. `isArbitrage`
 * tells you which case you're in.
 */

/** One outcome's stake and return within an {@link ArbitrageResult}. */
export interface ArbitrageLine {
  readonly odds: Fraction;
  readonly stake: Fraction;
  /** `stake × odds` — identical across every line, by construction. */
  readonly returned: Fraction;
}

/** The full result of splitting a stake across an arbitrage (or not) opportunity. */
export interface ArbitrageResult {
  readonly lines: readonly ArbitrageLine[];
  readonly totalStaked: Fraction;
  /** The same regardless of which outcome happens. Negative when there is no arbitrage. */
  readonly guaranteedProfit: Fraction;
  /** `guaranteedProfit / totalStaked` — e.g. `1/9` for an 11.1% margin. */
  readonly roi: Fraction;
  /** `true` when `roi > 0` — a genuine, guaranteed-profit opportunity. */
  readonly isArbitrage: boolean;
}

function sumImpliedProbabilities(marketOdds: readonly Fraction[]): Fraction {
  if (marketOdds.length === 0) {
    throw new RangeError(
      'calculateArbitrageStakes: marketOdds must not be empty.',
    );
  }
  return marketOdds.reduce(
    (sum, odds) => addFractions(sum, impliedProbability(odds)),
    ZERO,
  );
}

/**
 * Quick check for whether `marketOdds` is a guaranteed-profit arbitrage —
 * equivalent to `calculateOverround(marketOdds) < 0` (market.ts), for
 * callers who just want a yes/no without paying for a full stake split.
 *
 * Throws under the same conditions as {@link calculateArbitrageStakes}
 * (empty `marketOdds`, or any odds not greater than `1`).
 */
export function detectArbitrage(marketOdds: readonly Fraction[]): boolean {
  return compareFractions(sumImpliedProbabilities(marketOdds), ONE) < 0;
}

/**
 * Split `totalStake` across every outcome in `marketOdds` so the return is
 * identical no matter which outcome wins.
 *
 * ```ts
 * calculateArbitrageStakes([fraction(2, 1), fraction(5, 2)], fraction(100, 1));
 * // stakes 500/9 ≈ 55.56 and 400/9 ≈ 44.44; guaranteedProfit 100/9 ≈ 11.11
 * // (roi 1/9 ≈ 11.1%) — a genuine arbitrage
 *
 * calculateArbitrageStakes(
 *   [fraction(191, 100), fraction(191, 100)],
 *   fraction(100, 1),
 * );
 * // guaranteedProfit is negative (roi -9/200 = -4.5%) — a single book's own
 * // market, not an arbitrage
 * ```
 *
 * `stake_i = totalStake × impliedProbability(odds_i) / Σ impliedProbability`
 * — the same proportional split {@link calculateFairOdds} (market.ts) uses
 * to de-vig a market, applied to money instead of odds. The stakes always
 * sum to exactly `totalStake`, and every line's `returned` is exactly
 * `totalStake / Σ impliedProbability` — the `odds_i` cancels out
 * algebraically, so this holds for any market, not just a fair one.
 *
 * Throws if `marketOdds` is empty, any odds isn't greater than `1`, or
 * `totalStake` isn't positive.
 */
export function calculateArbitrageStakes(
  marketOdds: readonly Fraction[],
  totalStake: Fraction,
): ArbitrageResult {
  if (compareFractions(totalStake, ZERO) <= 0) {
    throw new RangeError(
      `calculateArbitrageStakes: totalStake must be > 0, got ${fractionToString(totalStake)}.`,
    );
  }
  const sum = sumImpliedProbabilities(marketOdds);

  const lines: ArbitrageLine[] = marketOdds.map((odds) => {
    const stake = multiplyFractions(
      totalStake,
      divideFractions(impliedProbability(odds), sum),
    );
    return { odds, stake, returned: multiplyFractions(stake, odds) };
  });

  // Every line returns the same amount by construction (see the JSDoc
  // above) — take the first as the guaranteed return.
  const guaranteedReturn = lines[0].returned;
  const guaranteedProfit = subtractFractions(guaranteedReturn, totalStake);
  const roi = divideFractions(guaranteedProfit, totalStake);

  return {
    lines,
    totalStaked: totalStake,
    guaranteedProfit,
    roi,
    isArbitrage: compareFractions(roi, ZERO) > 0,
  };
}
