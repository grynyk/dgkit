import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  addFractions,
  compareFractions,
  divideFractions,
  fraction,
  fractionFromNumber,
  fractionToNumber,
  fractionToString,
  multiplyFractions,
  ONE,
  reduceFraction,
  subtractFractions,
  ZERO,
  type Fraction,
} from './fraction';

/** A fraction arbitrary with a bounded, non-zero denominator. */
const fractionArb: fc.Arbitrary<Fraction> = fc
  .tuple(
    fc.integer({ min: -1_000_000, max: 1_000_000 }),
    fc.integer({ min: 1, max: 1_000_000 }),
  )
  .map(([num, den]) => fraction(num, den));

describe('fraction()', () => {
  it('builds and reduces integer ratios', () => {
    expect(fraction(5, 2)).toEqual({ num: 5n, den: 2n });
    expect(fraction(4, 2)).toEqual({ num: 2n, den: 1n });
    expect(fraction(3)).toEqual({ num: 3n, den: 1n });
    expect(fraction(-5, 2)).toEqual({ num: -5n, den: 2n });
    expect(fraction(5, -2)).toEqual({ num: -5n, den: 2n });
  });

  it('normalizes zero regardless of denominator', () => {
    expect(fraction(0, 7)).toEqual(ZERO);
  });

  it('throws on a zero denominator', () => {
    expect(() => fraction(1, 0)).toThrow(RangeError);
  });

  it('throws on a non-integer number argument', () => {
    expect(() => fraction(1.5, 1)).toThrow(RangeError);
    expect(() => fraction(1, 1.5)).toThrow(RangeError);
  });

  it('accepts bigint arguments directly', () => {
    expect(fraction(10n, 4n)).toEqual({ num: 5n, den: 2n });
  });
});

describe('reduceFraction', () => {
  it('is idempotent', () => {
    fc.assert(
      fc.property(fractionArb, (f) => {
        expect(reduceFraction(f)).toEqual(reduceFraction(reduceFraction(f)));
      }),
    );
  });

  it('always produces a positive denominator and a coprime pair', () => {
    fc.assert(
      fc.property(fractionArb, (f) => {
        expect(f.den > 0n).toBe(true);
        if (f.num !== 0n) {
          const a = f.num < 0n ? -f.num : f.num;
          let x = a;
          let y = f.den;
          while (y !== 0n) [x, y] = [y, x % y];
          expect(x).toBe(1n);
        } else {
          expect(f.den).toBe(1n);
        }
      }),
    );
  });

  it('throws on a zero denominator', () => {
    expect(() => reduceFraction({ num: 1n, den: 0n })).toThrow(RangeError);
  });
});

describe('arithmetic', () => {
  it('addition is commutative and associative', () => {
    fc.assert(
      fc.property(fractionArb, fractionArb, fractionArb, (a, b, c) => {
        expect(addFractions(a, b)).toEqual(addFractions(b, a));
        expect(addFractions(addFractions(a, b), c)).toEqual(
          addFractions(a, addFractions(b, c)),
        );
      }),
    );
  });

  it('ZERO is the additive identity', () => {
    fc.assert(
      fc.property(fractionArb, (a) => {
        expect(addFractions(a, ZERO)).toEqual(a);
      }),
    );
  });

  it('multiplication is commutative and associative', () => {
    fc.assert(
      fc.property(fractionArb, fractionArb, fractionArb, (a, b, c) => {
        expect(multiplyFractions(a, b)).toEqual(multiplyFractions(b, a));
        expect(multiplyFractions(multiplyFractions(a, b), c)).toEqual(
          multiplyFractions(a, multiplyFractions(b, c)),
        );
      }),
    );
  });

  it('ONE is the multiplicative identity', () => {
    fc.assert(
      fc.property(fractionArb, (a) => {
        expect(multiplyFractions(a, ONE)).toEqual(a);
      }),
    );
  });

  it('subtraction is the inverse of addition', () => {
    fc.assert(
      fc.property(fractionArb, fractionArb, (a, b) => {
        expect(addFractions(subtractFractions(a, b), b)).toEqual(a);
      }),
    );
  });

  it('division is the inverse of multiplication (for non-zero b)', () => {
    fc.assert(
      fc.property(
        fractionArb,
        fractionArb.filter((b) => b.num !== 0n),
        (a, b) => {
          expect(multiplyFractions(divideFractions(a, b), b)).toEqual(a);
        },
      ),
    );
  });

  it('divideFractions throws when dividing by zero', () => {
    expect(() => divideFractions(ONE, ZERO)).toThrow(RangeError);
  });
});

describe('compareFractions', () => {
  it('agrees with the sign of the difference', () => {
    fc.assert(
      fc.property(fractionArb, fractionArb, (a, b) => {
        const diff = subtractFractions(a, b);
        const expected = diff.num > 0n ? 1 : diff.num < 0n ? -1 : 0;
        expect(compareFractions(a, b)).toBe(expected);
      }),
    );
  });

  it('is reflexive', () => {
    fc.assert(
      fc.property(fractionArb, (a) => {
        expect(compareFractions(a, a)).toBe(0);
      }),
    );
  });

  it('distinguishes equal-value fractions with different representations before reduction', () => {
    expect(compareFractions(fraction(2, 4), fraction(1, 2))).toBe(0);
  });
});

describe('fractionFromNumber / fractionToNumber', () => {
  it('parses exact decimal text, not the nearest float', () => {
    // 1.91 has no exact binary representation; the string-based parse must
    // still recover exactly 191/100.
    expect(fractionFromNumber(1.91)).toEqual({ num: 191n, den: 100n });
    expect(fractionFromNumber(2)).toEqual({ num: 2n, den: 1n });
    expect(fractionFromNumber(-0.25)).toEqual({ num: -1n, den: 4n });
    expect(fractionFromNumber(0)).toEqual(ZERO);
  });

  it('round-trips through fractionToNumber for representable decimals', () => {
    fc.assert(
      fc.property(
        fc
          .double({
            min: -1_000,
            max: 1_000,
            noNaN: true,
            noDefaultInfinity: true,
          })
          .map(
            // Round to a fixed number of decimal places so toString() never
            // produces exponential notation for these magnitudes.
            (n) => Math.round(n * 100) / 100,
          ),
        (n) => {
          expect(fractionToNumber(fractionFromNumber(n))).toBeCloseTo(n, 9);
        },
      ),
    );
  });

  it('throws on non-finite input', () => {
    expect(() => fractionFromNumber(Number.NaN)).toThrow(RangeError);
    expect(() => fractionFromNumber(Number.POSITIVE_INFINITY)).toThrow(
      RangeError,
    );
  });

  it('throws on values that stringify to exponential notation', () => {
    expect(() => fractionFromNumber(1e21)).toThrow(RangeError);
    expect(() => fractionFromNumber(1e-7)).toThrow(RangeError);
  });
});

describe('fractionToString', () => {
  it('always renders num/den, including whole numbers', () => {
    expect(fractionToString(fraction(5, 2))).toBe('5/2');
    expect(fractionToString(fraction(3))).toBe('3/1');
    expect(fractionToString(ZERO)).toBe('0/1');
  });
});
