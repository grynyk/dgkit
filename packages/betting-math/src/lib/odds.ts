import {
  addFractions,
  divideFractions,
  fraction,
  fractionFromNumber,
  fractionToNumber,
  fractionToString,
  multiplyFractions,
  ONE,
  subtractFractions,
  type Fraction,
} from './fraction';

/**
 * A supported odds notation.
 *
 * - `decimal` — total return per unit stake, stake included (e.g. `2.5`).
 * - `fractional` — UK/Irish "5/2" notation, as a `"num/den"` string.
 * - `american` — US "moneyline" notation (`+150` / `-150`).
 * - `hongkong` — Hong Kong notation: profit per unit stake, stake excluded.
 * - `malay` — Malaysian notation: positive for decimal odds `< 2` (the
 *   shorter/favorite price), negative for decimal odds `>= 2` (the
 *   longer/underdog price) — a sign-flipped reciprocal of Hong Kong odds,
 *   kept within `[-1, 0) ∪ (0, 1]` so large underdog prices don't produce an
 *   unbounded number. `parseOdds` rejects magnitudes outside that range.
 * - `indonesian` — the same shape and domain as `malay` (positive below
 *   evens, negative at or above), historically derived from American odds
 *   scaled by 1/100.
 */
export type OddsFormat =
  'decimal' | 'fractional' | 'american' | 'hongkong' | 'malay' | 'indonesian';

function requireDecimalRange(decimal: Fraction, context: string): void {
  if (decimal.num <= decimal.den) {
    throw new RangeError(
      `${context}: decimal odds must be greater than 1, got ${fractionToString(decimal)}.`,
    );
  }
}

/**
 * Parse odds in any supported {@link OddsFormat} into canonical decimal odds
 * (a {@link Fraction} greater than `1`, representing total return per unit
 * stake including the stake itself).
 *
 * ```ts
 * parseOdds(2.5, 'decimal');      // 5/2
 * parseOdds('5/2', 'fractional'); // 7/2
 * parseOdds(150, 'american');     // 5/2
 * parseOdds(-150, 'american');    // 5/3
 * parseOdds(1.5, 'hongkong');     // 5/2
 * ```
 *
 * Throws a `RangeError` on a value outside the format's valid domain (e.g.
 * decimal `<= 1`, American odds between `-99` and `99`, or a zero-valued
 * Malay/Indonesian price) — an invalid odds value is a money bug, so this
 * fails loudly rather than coercing to a plausible-looking wrong answer.
 */
export function parseOdds(
  value: number | string,
  format: OddsFormat,
): Fraction {
  switch (format) {
    case 'decimal': {
      const decimal = fractionFromNumber(requireNumber(value, format));
      requireDecimalRange(decimal, 'parseOdds(decimal)');
      return decimal;
    }
    case 'fractional': {
      return parseFractionalOdds(requireString(value, format));
    }
    case 'american': {
      return parseAmericanOdds(requireNumber(value, format));
    }
    case 'hongkong': {
      const hk = fractionFromNumber(requireNumber(value, format));
      if (hk.num <= 0n) {
        throw new RangeError(
          `parseOdds(hongkong): odds must be greater than 0, got ${fractionToString(hk)}.`,
        );
      }
      return addFractions(ONE, hk);
    }
    case 'malay': {
      return parseMalayLikeOdds(requireNumber(value, format), 'malay');
    }
    case 'indonesian': {
      return parseMalayLikeOdds(requireNumber(value, format), 'indonesian');
    }
  }
}

function requireNumber(value: number | string, format: OddsFormat): number {
  if (typeof value !== 'number') {
    throw new TypeError(
      `parseOdds(${format}): expected a number, got a string.`,
    );
  }
  return value;
}

function requireString(value: number | string, format: OddsFormat): string {
  if (typeof value !== 'string') {
    throw new TypeError(
      `parseOdds(${format}): expected a "num/den" string, got a number.`,
    );
  }
  return value;
}

function parseFractionalOdds(value: string): Fraction {
  const match = /^(\d+)\/(\d+)$/.exec(value.trim());
  if (!match) {
    throw new RangeError(
      `parseOdds(fractional): expected "num/den" (e.g. "5/2"), got "${value}".`,
    );
  }
  const den = BigInt(match[2]);
  if (den === 0n) {
    throw new RangeError(
      'parseOdds(fractional): denominator must not be zero.',
    );
  }
  return addFractions(ONE, fraction(BigInt(match[1]), den));
}

function parseAmericanOdds(value: number): Fraction {
  if (!Number.isInteger(value) || Math.abs(value) < 100) {
    throw new RangeError(
      `parseOdds(american): expected an integer <= -100 or >= 100, got ${value}.`,
    );
  }
  return value > 0
    ? addFractions(ONE, fraction(value, 100))
    : addFractions(ONE, fraction(100, -value));
}

function parseMalayLikeOdds(
  value: number,
  format: 'malay' | 'indonesian',
): Fraction {
  if (value === 0 || value > 1 || value < -1) {
    throw new RangeError(
      `parseOdds(${format}): expected a value in [-1, 0) or (0, 1], got ${value}.`,
    );
  }
  const magnitude = fractionFromNumber(value);
  return value > 0
    ? addFractions(ONE, magnitude)
    : subtractFractions(ONE, divideFractions(ONE, magnitude));
}

/**
 * Format canonical decimal odds (see {@link parseOdds}) into any supported
 * {@link OddsFormat}.
 *
 * Returns a `number` for every format except `fractional`, which returns a
 * reduced `"num/den"` string. The result is the *exact* mathematical value
 * for the target format — real-world American/Hong Kong/Malay/Indonesian
 * prices are always whole numbers or simple decimals in practice, but this
 * function does not round, so a `decimalOdds` produced by, say, a dead-heat
 * reduction may format to a value with more precision than a bookmaker would
 * ever quote. Round for display if that matters to your use case.
 */
export function formatOdds(
  decimalOdds: Fraction,
  format: OddsFormat,
): number | string {
  requireDecimalRange(decimalOdds, 'formatOdds');
  const profit = subtractFractions(decimalOdds, ONE);

  switch (format) {
    case 'decimal':
      return fractionToNumber(decimalOdds);
    case 'fractional':
      return fractionToString(profit);
    case 'american':
      return fractionToNumber(
        compareIsOddsOn(decimalOdds)
          ? divideFractions(fraction(-100), profit)
          : multiplyFractions(profit, fraction(100)),
      );
    case 'hongkong':
      return fractionToNumber(profit);
    case 'malay':
    case 'indonesian':
      // decimal < 2 (odds-on) -> positive value = profit directly;
      // decimal >= 2 -> negative value = -1/profit. (Verified against
      // published Malay/Indonesian odds conversion tables — this is the
      // opposite branch from American, which goes negative *below* 2.)
      return fractionToNumber(
        compareIsOddsOn(decimalOdds)
          ? profit
          : multiplyFractions(divideFractions(ONE, profit), fraction(-1)),
      );
  }
}

/** `true` when decimal odds are "odds-on" (< 2.0 — the favorite pays less than evens). */
function compareIsOddsOn(decimalOdds: Fraction): boolean {
  return decimalOdds.num < 2n * decimalOdds.den;
}
