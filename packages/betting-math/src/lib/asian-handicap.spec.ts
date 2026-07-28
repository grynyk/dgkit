import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { fraction, fractionToNumber, ZERO } from './fraction';
import {
  settleAsianHandicap,
  settleAsianHandicapLine,
  splitQuarterLine,
} from './asian-handicap';

describe('splitQuarterLine', () => {
  it('splits a negative quarter line into its two adjacent lines', () => {
    expect(splitQuarterLine(-0.25)).toEqual([-0.5, 0]);
    expect(splitQuarterLine(-0.75)).toEqual([-1, -0.5]);
  });

  it('splits a positive quarter line into its two adjacent lines', () => {
    expect(splitQuarterLine(0.25)).toEqual([0, 0.5]);
    expect(splitQuarterLine(0.75)).toEqual([0.5, 1]);
  });

  it('returns whole and half lines unchanged, as a single-element tuple', () => {
    expect(splitQuarterLine(0)).toEqual([0]);
    expect(splitQuarterLine(-1)).toEqual([-1]);
    expect(splitQuarterLine(0.5)).toEqual([0.5]);
    expect(splitQuarterLine(-2.5)).toEqual([-2.5]);
  });

  it('throws for a line that is not a multiple of 0.25', () => {
    expect(() => splitQuarterLine(0.1)).toThrow(RangeError);
  });
});

describe('settleAsianHandicapLine', () => {
  const stake = fraction(10, 1);
  const odds = fraction(2, 1);

  it('wins when the adjusted score difference is positive', () => {
    // Backed at -0.5, wins 1-0: adjusted = 1 - 0.5 = 0.5 > 0.
    expect(settleAsianHandicapLine(-0.5, 1, stake, odds)).toEqual({
      outcome: 'win',
      returned: fraction(20, 1),
    });
  });

  it('loses when the adjusted score difference is negative', () => {
    // Backed at -0.5, draws 0-0: adjusted = 0 - 0.5 = -0.5 < 0.
    expect(settleAsianHandicapLine(-0.5, 0, stake, odds)).toEqual({
      outcome: 'lose',
      returned: ZERO,
    });
  });

  it('pushes when the adjusted score difference is exactly zero', () => {
    // Backed at -1, wins 1-0: adjusted = 1 - 1 = 0.
    expect(settleAsianHandicapLine(-1, 1, stake, odds)).toEqual({
      outcome: 'push',
      returned: stake,
    });
  });

  it('a half line never pushes (adjusted can never be exactly zero)', () => {
    fc.assert(
      fc.property(fc.integer({ min: -5, max: 5 }), (scoreDiff) => {
        const result = settleAsianHandicapLine(-0.5, scoreDiff, stake, odds);
        expect(result.outcome).not.toBe('push');
      }),
    );
  });

  it('throws when given a quarter line', () => {
    expect(() => settleAsianHandicapLine(-0.25, 0, stake, odds)).toThrow(
      RangeError,
    );
  });
});

describe('settleAsianHandicap', () => {
  const odds = fraction(2, 1);

  it('a whole/half line behaves the same as settleAsianHandicapLine (no split)', () => {
    const stake = fraction(10, 1);
    // Backed at -1, wins 2-0: adjusted = 2 - 1 = 1 > 0.
    const result = settleAsianHandicap(-1, 2, stake, odds);
    expect(result.parts).toEqual([
      { line: -1, outcome: 'win', stake, returned: fraction(20, 1) },
    ]);
    expect(result.totalReturned).toEqual(fraction(20, 1));
  });

  it('quarter line, draw: "back at -0.25, match draws" loses half the stake (documented reference case)', () => {
    const stake = fraction(20, 1);
    const result = settleAsianHandicap(-0.25, 0, stake, odds);
    expect(result.parts).toEqual([
      { line: -0.5, outcome: 'lose', stake: fraction(10, 1), returned: ZERO },
      {
        line: 0,
        outcome: 'push',
        stake: fraction(10, 1),
        returned: fraction(10, 1),
      },
    ]);
    // Half the stake pushes back, half is lost: net returned = 10 (out of 20 staked).
    expect(result.totalReturned).toEqual(fraction(10, 1));
  });

  it('quarter line, backed side wins outright: both halves win', () => {
    const stake = fraction(20, 1);
    // Backed at +0.75, backed side wins 1-0: adjusted on both 0.5 and 1.0 legs is positive.
    const result = settleAsianHandicap(0.75, 1, stake, odds);
    expect(result.parts.map((p) => p.outcome)).toEqual(['win', 'win']);
    expect(result.totalReturned).toEqual(fraction(40, 1));
  });

  it('quarter-line total returned is always the sum of its two half-stake parts', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -3, max: 3 }).map((n) => n + 0.25),
        fc.integer({ min: -5, max: 5 }),
        fc.integer({ min: 1, max: 1000 }),
        (line, scoreDiff, num) => {
          const stake = fraction(num * 2, 1);
          const result = settleAsianHandicap(line, scoreDiff, stake, odds);
          const sum = result.parts.reduce(
            (acc, p) => acc + fractionToNumber(p.returned),
            0,
          );
          expect(fractionToNumber(result.totalReturned)).toBeCloseTo(sum, 9);
        },
      ),
    );
  });
});
