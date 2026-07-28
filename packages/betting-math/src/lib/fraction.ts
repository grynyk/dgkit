/**
 * An exact rational number, stored as a reduced `bigint` ratio.
 *
 * Every calculation in this package is done in `Fraction` space rather than
 * with floating-point `number`s: betting math is money math, and IEEE-754
 * doubles cannot represent values like `1/3` exactly, which is enough to
 * make a chain of dead-heat/Rule-4/system-bet multiplications drift off the
 * true answer by a cent. `Fraction`s never round until the final
 * `fractionToNumber` call at a display boundary.
 *
 * Always normalized: `den > 0n`, and `gcd(|num|, den) === 1n` (or
 * `num === 0n && den === 1n`).
 */
export interface Fraction {
  readonly num: bigint;
  readonly den: bigint;
}

/** The additive identity, `0/1`. */
export const ZERO: Fraction = { num: 0n, den: 1n };

/** The multiplicative identity, `1/1`. */
export const ONE: Fraction = { num: 1n, den: 1n };

function absBigInt(value: bigint): bigint {
  return value < 0n ? -value : value;
}

function gcdBigInt(a: bigint, b: bigint): bigint {
  let x = absBigInt(a);
  let y = absBigInt(b);
  while (y !== 0n) {
    [x, y] = [y, x % y];
  }
  return x;
}

/**
 * Reduce a fraction to lowest terms with a positive denominator.
 *
 * `0` always normalizes to `0/1` regardless of its input denominator's sign
 * or magnitude, so `ZERO` is the unique representation of zero.
 */
export function reduceFraction(f: Fraction): Fraction {
  if (f.den === 0n) {
    throw new RangeError('Fraction denominator must not be zero.');
  }
  if (f.num === 0n) {
    return ZERO;
  }
  const sign = f.den < 0n ? -1n : 1n;
  const num = f.num * sign;
  const den = f.den * sign;
  const divisor = gcdBigInt(num, den);
  return { num: num / divisor, den: den / divisor };
}

/**
 * Build a reduced {@link Fraction} from an integer numerator/denominator
 * pair. For non-integer decimal input (e.g. `1.91`) use
 * {@link fractionFromNumber} instead.
 *
 * ```ts
 * fraction(5, 2);  // 5/2 — e.g. fractional odds "5/2"
 * fraction(3);     // 3/1
 * ```
 *
 * Throws if `den` is zero, or if either argument is a non-integer `number`
 * (silently truncating would produce a wrong-but-plausible fraction, which
 * is exactly the failure mode this package exists to avoid).
 */
export function fraction(
  num: number | bigint,
  den: number | bigint = 1,
): Fraction {
  return reduceFraction({
    num: toBigInt(num, 'num'),
    den: toBigInt(den, 'den'),
  });
}

function toBigInt(value: number | bigint, argName: string): bigint {
  if (typeof value === 'bigint') {
    return value;
  }
  if (!Number.isInteger(value)) {
    throw new RangeError(
      `fraction(): "${argName}" must be an integer or bigint, got ${value}. ` +
        'Use fractionFromNumber() for non-integer decimal input.',
    );
  }
  return BigInt(value);
}

export function addFractions(a: Fraction, b: Fraction): Fraction {
  return reduceFraction({
    num: a.num * b.den + b.num * a.den,
    den: a.den * b.den,
  });
}

export function subtractFractions(a: Fraction, b: Fraction): Fraction {
  return reduceFraction({
    num: a.num * b.den - b.num * a.den,
    den: a.den * b.den,
  });
}

export function multiplyFractions(a: Fraction, b: Fraction): Fraction {
  return reduceFraction({ num: a.num * b.num, den: a.den * b.den });
}

/** Throws if `b` is zero. */
export function divideFractions(a: Fraction, b: Fraction): Fraction {
  if (b.num === 0n) {
    throw new RangeError('Cannot divide a Fraction by zero.');
  }
  return reduceFraction({ num: a.num * b.den, den: a.den * b.num });
}

/** `-1` if `a < b`, `0` if equal, `1` if `a > b`. */
export function compareFractions(a: Fraction, b: Fraction): -1 | 0 | 1 {
  // a.den and b.den are always positive (reduced form), so cross-multiplying
  // preserves the inequality direction.
  const left = a.num * b.den;
  const right = b.num * a.den;
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

/**
 * Parse a finite decimal `number` into an exact {@link Fraction}.
 *
 * Converts through the number's decimal string representation rather than
 * its binary bit pattern, so `fractionFromNumber(1.91)` is exactly `191/100`
 * — the value a human typed — not the nearest IEEE-754 double to `1.91`.
 *
 * Throws on `NaN`, `Infinity`, or a value whose string form uses exponential
 * notation (`1e21` and smaller-magnitude values below `1e-6`) — betting odds
 * never legitimately reach those magnitudes, so this fails loudly rather
 * than silently mis-parsing.
 */
export function fractionFromNumber(value: number): Fraction {
  if (!Number.isFinite(value)) {
    throw new RangeError(
      `fractionFromNumber(): expected a finite number, got ${value}.`,
    );
  }
  const text = value.toString();
  if (text.includes('e') || text.includes('E')) {
    throw new RangeError(
      `fractionFromNumber(): ${value} stringifies to exponential notation ` +
        `("${text}"), which is not supported.`,
    );
  }
  const negative = text.startsWith('-');
  const unsigned = negative ? text.slice(1) : text;
  const [wholePart, fractionalPart = ''] = unsigned.split('.');
  const den = 10n ** BigInt(fractionalPart.length);
  const num = BigInt(wholePart + fractionalPart) * (negative ? -1n : 1n);
  return reduceFraction({ num, den });
}

/**
 * Convert a {@link Fraction} to a `number`.
 *
 * This is the one place precision may be lost — intended only as the final
 * step before displaying or comparing against ordinary JS numbers, never as
 * an intermediate value in a calculation chain.
 */
export function fractionToNumber(f: Fraction): number {
  return Number(f.num) / Number(f.den);
}

/** Render as `"num/den"`, e.g. `"5/2"`. Always shows the denominator, even `/1`. */
export function fractionToString(f: Fraction): string {
  return `${f.num}/${f.den}`;
}
