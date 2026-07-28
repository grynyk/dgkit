import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { fraction, fractionToNumber } from './fraction';
import { formatOdds, parseOdds, type OddsFormat } from './odds';

describe('parseOdds', () => {
  it('decimal: wraps the value as an exact Fraction', () => {
    expect(parseOdds(2.5, 'decimal')).toEqual(fraction(5, 2));
  });

  it('decimal: rejects <= 1', () => {
    expect(() => parseOdds(1, 'decimal')).toThrow(RangeError);
    expect(() => parseOdds(0.5, 'decimal')).toThrow(RangeError);
  });

  it('fractional: "5/2" -> 7/2 decimal', () => {
    expect(parseOdds('5/2', 'fractional')).toEqual(fraction(7, 2));
  });

  it('fractional: "1/1" (evens) -> 2/1 decimal', () => {
    expect(parseOdds('1/1', 'fractional')).toEqual(fraction(2, 1));
  });

  it('fractional: rejects malformed input', () => {
    expect(() => parseOdds('5-2', 'fractional')).toThrow(RangeError);
    expect(() => parseOdds('5/0', 'fractional')).toThrow(RangeError);
  });

  it('american: +150 -> 5/2 decimal, -150 -> 5/3 decimal', () => {
    expect(parseOdds(150, 'american')).toEqual(fraction(5, 2));
    expect(parseOdds(-150, 'american')).toEqual(fraction(5, 3));
  });

  it('american: +100 and -100 both mean evens (2/1 decimal)', () => {
    expect(parseOdds(100, 'american')).toEqual(fraction(2, 1));
    expect(parseOdds(-100, 'american')).toEqual(fraction(2, 1));
  });

  it('american: rejects magnitudes below 100 and non-integers', () => {
    expect(() => parseOdds(50, 'american')).toThrow(RangeError);
    expect(() => parseOdds(150.5, 'american')).toThrow(RangeError);
  });

  it('hongkong: 1.5 -> 5/2 decimal', () => {
    expect(parseOdds(1.5, 'hongkong')).toEqual(fraction(5, 2));
  });

  it('hongkong: rejects <= 0', () => {
    expect(() => parseOdds(0, 'hongkong')).toThrow(RangeError);
    expect(() => parseOdds(-1, 'hongkong')).toThrow(RangeError);
  });

  // Malay/Indonesian: positive <-> decimal < 2 (shorter/favorite price),
  // negative <-> decimal >= 2 (longer/underdog price). Verified against
  // published conversion references (see odds.ts).
  it('malay: positive (decimal < 2) 0.5 -> 3/2 decimal', () => {
    expect(parseOdds(0.5, 'malay')).toEqual(fraction(3, 2));
  });

  it('malay: negative (decimal >= 2) -0.5 -> 3/1 decimal', () => {
    expect(parseOdds(-0.5, 'malay')).toEqual(fraction(3, 1));
  });

  it('malay: +1 and -1 both mean evens (2/1 decimal)', () => {
    expect(parseOdds(1, 'malay')).toEqual(fraction(2, 1));
    expect(parseOdds(-1, 'malay')).toEqual(fraction(2, 1));
  });

  it('malay: rejects zero and magnitudes above 1', () => {
    expect(() => parseOdds(0, 'malay')).toThrow(RangeError);
    expect(() => parseOdds(1.5, 'malay')).toThrow(RangeError);
    expect(() => parseOdds(-1.5, 'malay')).toThrow(RangeError);
  });

  it('indonesian: same shape and domain as malay', () => {
    expect(parseOdds(0.5, 'indonesian')).toEqual(fraction(3, 2));
    expect(parseOdds(-0.5, 'indonesian')).toEqual(fraction(3, 1));
    expect(() => parseOdds(1.5, 'indonesian')).toThrow(RangeError);
  });

  it('throws a TypeError when the value type does not match the format', () => {
    expect(() => parseOdds('2.5', 'decimal')).toThrow(TypeError);
    expect(() => parseOdds(2.5, 'fractional')).toThrow(TypeError);
  });
});

describe('formatOdds', () => {
  it('formats decimal 1.5 (< 2, "odds-on") into every format', () => {
    const decimal = fraction(3, 2);
    expect(formatOdds(decimal, 'decimal')).toBe(1.5);
    expect(formatOdds(decimal, 'fractional')).toBe('1/2');
    expect(formatOdds(decimal, 'american')).toBe(-200);
    expect(formatOdds(decimal, 'hongkong')).toBe(0.5);
    expect(formatOdds(decimal, 'malay')).toBe(0.5);
    expect(formatOdds(decimal, 'indonesian')).toBe(0.5);
  });

  it('formats decimal 3 (>= 2, underdog) into every format', () => {
    const decimal = fraction(3, 1);
    expect(formatOdds(decimal, 'american')).toBe(200);
    expect(formatOdds(decimal, 'malay')).toBe(-0.5);
    expect(formatOdds(decimal, 'indonesian')).toBe(-0.5);
  });

  it('formats evens (2/1) as +100 american but -1 malay/indonesian', () => {
    const decimal = fraction(2, 1);
    expect(formatOdds(decimal, 'american')).toBe(100);
    expect(formatOdds(decimal, 'malay')).toBe(-1);
    expect(formatOdds(decimal, 'indonesian')).toBe(-1);
  });

  it('rejects decimal odds <= 1', () => {
    expect(() => formatOdds(fraction(1, 1), 'decimal')).toThrow(RangeError);
  });
});

const NON_AMERICAN_FORMATS: readonly OddsFormat[] = [
  'decimal',
  'hongkong',
  'malay',
  'indonesian',
];

describe('parseOdds / formatOdds round-trip', () => {
  it('fractional format round-trips arbitrary rationals exactly (no decimal involved)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10_000 }),
        fc.integer({ min: 1, max: 10_000 }),
        (num, den) => {
          const decimal = parseOdds(`${num}/${den}`, 'fractional');
          const backToText = formatOdds(decimal, 'fractional');
          expect(parseOdds(backToText as string, 'fractional')).toEqual(
            decimal,
          );
        },
      ),
    );
  });

  it.each(NON_AMERICAN_FORMATS)(
    '%s round-trips "nice" 2-decimal-place decimal odds',
    (format) => {
      fc.assert(
        fc.property(fc.integer({ min: 101, max: 100_000 }), (cents) => {
          const decimal = parseOdds(cents / 100, 'decimal');
          const formatted = formatOdds(decimal, format);
          const roundTripped = parseOdds(formatted, format);
          expect(fractionToNumber(roundTripped)).toBeCloseTo(
            fractionToNumber(decimal),
            6,
          );
        }),
      );
    },
  );

  it('american round-trips starting from integer american odds (its only valid domain)', () => {
    // Excludes magnitude 100: +100 and -100 both mean decimal 2.0 (evens),
    // and formatOdds canonically returns +100 for it — covered separately
    // above ("+100 and -100 both mean evens").
    fc.assert(
      fc.property(
        fc.integer({ min: 101, max: 100_000 }),
        fc.boolean(),
        (magnitude, negative) => {
          const original = negative ? -magnitude : magnitude;
          const decimal = parseOdds(original, 'american');
          const formatted = formatOdds(decimal, 'american') as number;
          expect(Math.round(formatted)).toBe(original);
        },
      ),
    );
  });
});
