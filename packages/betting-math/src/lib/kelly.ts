import { calculateEdge } from './expected-value';
import {
  compareFractions,
  divideFractions,
  fractionToString,
  maxFraction,
  minFraction,
  multiplyFractions,
  ONE,
  subtractFractions,
  ZERO,
  type Fraction,
} from './fraction';

/**
 * Kelly criterion staking — the bankroll fraction that maximizes long-run
 * geometric growth for a bet with a positive {@link calculateEdge | edge}.
 *
 * `f* = edge / (decimalOdds − 1)` (the standard `(b·p − q) / b` formula,
 * simplified — see {@link calculateKellyStake}'s JSDoc for the derivation).
 * Full Kelly is aggressive: it maximizes growth rate at the cost of large
 * drawdown variance, so real staking plans almost always apply a
 * `kellyFraction` below `1` ("half Kelly", "quarter Kelly", …) to trade some
 * growth for a smoother bankroll curve. This module never picks that
 * fraction for you — you always supply it.
 */

/** The result of {@link calculateKellyStake}. */
export interface KellyResult {
  /** Per unit staked — see {@link calculateEdge}. */
  readonly edge: Fraction;
  /** `edge / (decimalOdds − 1)`. Unclamped — negative when there's no edge. */
  readonly fullKellyFraction: Fraction;
  /** `fullKellyFraction × kellyFraction`. Unclamped. */
  readonly appliedFraction: Fraction;
  /** `appliedFraction × bankroll`, clamped to `[0, bankroll]`. */
  readonly recommendedStake: Fraction;
  /** `true` when `edge > 0` — whether there's anything to stake at all. */
  readonly hasEdge: boolean;
}

/**
 * The Kelly-optimal stake for a bet, given the bettor's estimate of its true
 * win probability, its price, and a bankroll.
 *
 * ```ts
 * calculateKellyStake(fraction(3, 5), fraction(2, 1), fraction(1_000, 1));
 * // full Kelly: recommendedStake 200 (a 60% true chance at odds of 2 is a 20% edge)
 *
 * calculateKellyStake(
 *   fraction(3, 5),
 *   fraction(2, 1),
 *   fraction(1_000, 1),
 *   fraction(1, 2), // half Kelly
 * );
 * // recommendedStake 100 — half the full-Kelly stake, same edge
 * ```
 *
 * **Derivation**: with `b = decimalOdds − 1` (net odds) and `p =
 * fairProbability`, the textbook formula is `f* = (b·p − q) / b` where
 * `q = 1 − p`. Since `b·p − q = b·p − (1 − p) = p·(b + 1) − 1 = p·decimalOdds
 * − 1`, the numerator is exactly {@link calculateEdge}'s `edge` — so
 * `f* = edge / b`, computed here by calling `calculateEdge` rather than
 * re-deriving it. Because `calculateEdge` requires `fairProbability` in
 * `(0, 1]`, `edge <= decimalOdds - 1 = b` always, so full Kelly (`kellyFraction
 * = 1`) never exceeds `1` on its own — the upper clamp on
 * `recommendedStake` only ever engages when a caller supplies a
 * `kellyFraction` greater than `1`.
 *
 * `fullKellyFraction`/`appliedFraction` are left unclamped (negative when
 * there's no edge) so the sign is visible; `recommendedStake` is the one
 * field clamped to `[0, bankroll]`, since "stake a negative amount" or
 * "stake more than the bankroll" aren't actions a caller can take.
 *
 * `calculateEdge`'s own validation covers `fairProbability` and
 * `decimalOdds`. Also throws if `bankroll` or `kellyFraction` isn't
 * positive — because `decimalOdds > 1` is guaranteed, `decimalOdds − 1` is
 * always `> 0`, so no separate divide-by-zero guard is needed for it.
 */
export function calculateKellyStake(
  fairProbability: Fraction,
  decimalOdds: Fraction,
  bankroll: Fraction,
  kellyFraction: Fraction = ONE,
): KellyResult {
  const edge = calculateEdge(fairProbability, decimalOdds);
  if (compareFractions(bankroll, ZERO) <= 0) {
    throw new RangeError(
      `calculateKellyStake: bankroll must be > 0, got ${fractionToString(bankroll)}.`,
    );
  }
  if (compareFractions(kellyFraction, ZERO) <= 0) {
    throw new RangeError(
      `calculateKellyStake: kellyFraction must be > 0, got ${fractionToString(kellyFraction)}.`,
    );
  }

  const netOdds = subtractFractions(decimalOdds, ONE);
  const fullKellyFraction = divideFractions(edge, netOdds);
  const appliedFraction = multiplyFractions(fullKellyFraction, kellyFraction);
  const rawStake = multiplyFractions(appliedFraction, bankroll);
  const recommendedStake = minFraction(maxFraction(rawStake, ZERO), bankroll);

  return {
    edge,
    fullKellyFraction,
    appliedFraction,
    recommendedStake,
    hasEdge: compareFractions(edge, ZERO) > 0,
  };
}
