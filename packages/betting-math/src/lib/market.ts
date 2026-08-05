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
 * Market-level odds analysis: implied probability, a market's total
 * overround (bookmaker margin / vig / hold), and de-vigged ("fair") odds
 * and probabilities.
 *
 * De-vigging here uses the **proportional (multiplicative) method** — the
 * standard, simplest approach, and the only one that stays exact in
 * `Fraction` space: every outcome's implied probability is scaled down by
 * the same factor so they sum to exactly `1`. Other published methods
 * (Shin's method, the power method) model favorite-longshot bias more
 * accurately but require solving for an implied root/parameter — inherently
 * irrational, so they're out of scope for this package's exact-rational
 * arithmetic.
 */

function requireDecimalOdds(odds: Fraction, context: string): void {
  if (compareFractions(odds, ONE) <= 0) {
    throw new RangeError(
      `${context}: decimal odds must be greater than 1, got ${fractionToString(odds)}.`,
    );
  }
}

/**
 * The implied probability behind a single set of decimal odds.
 *
 * ```ts
 * impliedProbability(fraction(2, 1)); // 1/2 — a 50% implied chance
 * impliedProbability(fraction(4, 1)); // 1/4
 * ```
 *
 * `probability = 1 / decimalOdds`. This is the *implied* probability the
 * quoted price bakes in — it includes the bookmaker's margin, so a full
 * market's implied probabilities sum to more than `1` (see
 * {@link calculateOverround}). Throws if `decimalOdds` isn't greater
 * than `1`.
 */
export function impliedProbability(decimalOdds: Fraction): Fraction {
  requireDecimalOdds(decimalOdds, 'impliedProbability');
  return divideFractions(ONE, decimalOdds);
}

function sumImpliedProbabilities(
  marketOdds: readonly Fraction[],
  context: string,
): Fraction {
  if (marketOdds.length === 0) {
    throw new RangeError(`${context}: marketOdds must not be empty.`);
  }
  return marketOdds.reduce(
    (sum, odds) => addFractions(sum, impliedProbability(odds)),
    ZERO,
  );
}

/**
 * A market's total overround — the bookmaker's built-in margin, also known
 * as the vig, juice, or hold.
 *
 * ```ts
 * calculateOverround([fraction(2, 1), fraction(2, 1)]); // 0 — a fair 2-way market
 * calculateOverround([fraction(191, 100), fraction(191, 100)]); // 9/191 ≈ 4.7% — standard -110/-110
 * ```
 *
 * `overround = Σ (1 / odds) − 1` across every outcome in `marketOdds` —
 * `marketOdds` must cover every possible outcome of the market (e.g. all
 * three prices of a 1X2 market, or both sides of a two-way handicap) for
 * this to mean anything; a subset just measures that subset's combined
 * implied probability. `0` is a perfectly fair (no-margin) market; a
 * negative result means the priced-in probabilities sum to *less* than `1`
 * — either an arbitrage opportunity (if `marketOdds` are the best available
 * prices across multiple books) or a mispriced book.
 *
 * Throws if `marketOdds` is empty, or if any odds isn't greater than `1`.
 */
export function calculateOverround(marketOdds: readonly Fraction[]): Fraction {
  return subtractFractions(
    sumImpliedProbabilities(marketOdds, 'calculateOverround'),
    ONE,
  );
}

/**
 * De-vigged ("fair") probabilities for every outcome in a market: each
 * implied probability scaled down by the same factor so they sum to
 * exactly `1`.
 *
 * ```ts
 * calculateFairProbabilities([fraction(191, 100), fraction(191, 100)]); // [1/2, 1/2]
 * ```
 *
 * See this module's top-level doc comment for why the proportional method
 * is the one implemented here. Throws under the same conditions as
 * {@link calculateOverround}.
 */
export function calculateFairProbabilities(
  marketOdds: readonly Fraction[],
): readonly Fraction[] {
  const sum = sumImpliedProbabilities(marketOdds, 'calculateFairProbabilities');
  return marketOdds.map((odds) =>
    divideFractions(impliedProbability(odds), sum),
  );
}

/**
 * De-vigged ("fair") decimal odds for every outcome in a market — the
 * reciprocal of {@link calculateFairProbabilities}, computed directly
 * (`fairOdds = odds × Σ(1 / odds)`) rather than by inverting a probability.
 *
 * ```ts
 * calculateFairOdds([fraction(191, 100), fraction(191, 100)]); // [2, 2] — -110/-110 devigs to even money
 * ```
 *
 * Throws under the same conditions as {@link calculateOverround}.
 */
export function calculateFairOdds(
  marketOdds: readonly Fraction[],
): readonly Fraction[] {
  const sum = sumImpliedProbabilities(marketOdds, 'calculateFairOdds');
  return marketOdds.map((odds) => multiplyFractions(odds, sum));
}
