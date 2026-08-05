import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  applyNegativeCarryover,
  calculateCpaCommission,
  calculateHybridCommission,
  calculateRevShareCommission,
  runCarryoverLedger,
} from './affiliate';
import {
  addFractions,
  compareFractions,
  fraction,
  fractionToNumber,
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

/** A non-positive fraction arbitrary, for `previousCarryover`/`initialCarryover`. */
const nonPositiveFractionArb: fc.Arbitrary<Fraction> = fc
  .tuple(
    fc.integer({ min: -1_000_000, max: 0 }),
    fc.integer({ min: 1, max: 1_000_000 }),
  )
  .map(([num, den]) => fraction(num, den));

describe('calculateCpaCommission', () => {
  it('multiplies qualifying count by the CPA rate', () => {
    expect(calculateCpaCommission(40, fraction(75, 1))).toEqual(
      fraction(3000, 1),
    );
    expect(calculateCpaCommission(0, fraction(75, 1))).toEqual(ZERO);
  });

  it('rejects a non-integer or negative qualifyingCount', () => {
    expect(() => calculateCpaCommission(1.5, fraction(75, 1))).toThrow(
      RangeError,
    );
    expect(() => calculateCpaCommission(-1, fraction(75, 1))).toThrow(
      RangeError,
    );
  });

  it('rejects a negative cpaRate', () => {
    expect(() => calculateCpaCommission(40, fraction(-1, 1))).toThrow(
      RangeError,
    );
  });

  it('is non-decreasing in qualifyingCount for a fixed non-negative rate', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10_000 }),
        fc.integer({ min: 0, max: 100_000 }),
        (count, rateCents) => {
          const rate = fraction(rateCents, 100);
          const lower = fractionToNumber(calculateCpaCommission(count, rate));
          const higher = fractionToNumber(
            calculateCpaCommission(count + 1, rate),
          );
          expect(higher).toBeGreaterThanOrEqual(lower);
        },
      ),
    );
  });
});

describe('calculateRevShareCommission', () => {
  it('takes a percentage of NGR', () => {
    expect(
      calculateRevShareCommission(fraction(10_000, 1), fraction(15, 100)),
    ).toEqual(fraction(1500, 1));
  });

  it('can be negative when NGR is negative (a losing period)', () => {
    expect(
      calculateRevShareCommission(fraction(-2000, 1), fraction(15, 100)),
    ).toEqual(fraction(-300, 1));
  });

  it('rejects revSharePercent outside [0, 1]', () => {
    expect(() =>
      calculateRevShareCommission(fraction(1000, 1), fraction(-1, 100)),
    ).toThrow(RangeError);
    expect(() =>
      calculateRevShareCommission(fraction(1000, 1), fraction(101, 100)),
    ).toThrow(RangeError);
  });
});

describe('calculateHybridCommission', () => {
  it('combines CPA and RevShare portions with a breakdown', () => {
    expect(
      calculateHybridCommission({
        qualifyingCount: 40,
        cpaRate: fraction(75, 1),
        ngr: fraction(10_000, 1),
        revSharePercent: fraction(15, 100),
      }),
    ).toEqual({
      cpaPortion: fraction(3000, 1),
      revSharePortion: fraction(1500, 1),
      total: fraction(4500, 1),
    });
  });

  it('propagates validation errors from either portion', () => {
    expect(() =>
      calculateHybridCommission({
        qualifyingCount: -1,
        cpaRate: fraction(75, 1),
        ngr: fraction(10_000, 1),
        revSharePercent: fraction(15, 100),
      }),
    ).toThrow(RangeError);
    expect(() =>
      calculateHybridCommission({
        qualifyingCount: 40,
        cpaRate: fraction(75, 1),
        ngr: fraction(10_000, 1),
        revSharePercent: fraction(2, 1),
      }),
    ).toThrow(RangeError);
  });
});

describe('applyNegativeCarryover', () => {
  it('shrinks the deficit without paying out while it remains negative', () => {
    expect(applyNegativeCarryover(fraction(-500, 1), fraction(300, 1))).toEqual(
      { payable: ZERO, carriedBalance: fraction(-200, 1) },
    );
  });

  it('clears the deficit and pays out the remainder once commission exceeds it', () => {
    expect(applyNegativeCarryover(fraction(-200, 1), fraction(800, 1))).toEqual(
      { payable: fraction(600, 1), carriedBalance: ZERO },
    );
  });

  it('caps the retained deficit when carryoverCap is given, forgiving the rest', () => {
    expect(
      applyNegativeCarryover(ZERO, fraction(-5000, 1), {
        carryoverCap: fraction(1000, 1),
      }),
    ).toEqual({ payable: ZERO, carriedBalance: fraction(-1000, 1) });
  });

  it('carryoverCap of ZERO means no carryover at all', () => {
    expect(
      applyNegativeCarryover(ZERO, fraction(-5000, 1), {
        carryoverCap: ZERO,
      }),
    ).toEqual({ payable: ZERO, carriedBalance: ZERO });
  });

  it('rejects a positive previousCarryover', () => {
    expect(() =>
      applyNegativeCarryover(fraction(1, 1), fraction(0, 1)),
    ).toThrow(RangeError);
  });

  it('rejects a negative carryoverCap', () => {
    expect(() =>
      applyNegativeCarryover(ZERO, fraction(-100, 1), {
        carryoverCap: fraction(-1, 1),
      }),
    ).toThrow(RangeError);
  });

  it('payable is always >= 0 and carriedBalance is always <= 0', () => {
    fc.assert(
      fc.property(nonPositiveFractionArb, fractionArb, (previous, period) => {
        const { payable, carriedBalance } = applyNegativeCarryover(
          previous,
          period,
        );
        expect(compareFractions(payable, ZERO)).toBeGreaterThanOrEqual(0);
        expect(compareFractions(carriedBalance, ZERO)).toBeLessThanOrEqual(0);
      }),
    );
  });

  it('uncapped: payable + carriedBalance always equals previousCarryover + periodCommission', () => {
    fc.assert(
      fc.property(nonPositiveFractionArb, fractionArb, (previous, period) => {
        const { payable, carriedBalance } = applyNegativeCarryover(
          previous,
          period,
        );
        expect(addFractions(payable, carriedBalance)).toEqual(
          addFractions(previous, period),
        );
      }),
    );
  });
});

describe('runCarryoverLedger', () => {
  it('folds a sequence of periods and matches sequential applyNegativeCarryover calls', () => {
    const result = runCarryoverLedger([
      fraction(-500, 1),
      fraction(300, 1),
      fraction(800, 1),
    ]);

    expect(result.periods).toEqual([
      {
        periodCommission: fraction(-500, 1),
        payable: ZERO,
        carriedBalance: fraction(-500, 1),
      },
      {
        periodCommission: fraction(300, 1),
        payable: ZERO,
        carriedBalance: fraction(-200, 1),
      },
      {
        periodCommission: fraction(800, 1),
        payable: fraction(600, 1),
        carriedBalance: ZERO,
      },
    ]);
    expect(result.totalPayable).toEqual(fraction(600, 1));
    expect(result.finalCarryover).toEqual(ZERO);
  });

  it('resumes from a supplied initialCarryover', () => {
    const result = runCarryoverLedger([fraction(300, 1)], {
      initialCarryover: fraction(-500, 1),
    });
    expect(result.finalCarryover).toEqual(fraction(-200, 1));
  });

  it('an empty period list returns the initial balance untouched', () => {
    const result = runCarryoverLedger([], {
      initialCarryover: fraction(-42, 1),
    });
    expect(result).toEqual({
      periods: [],
      totalPayable: ZERO,
      finalCarryover: fraction(-42, 1),
    });
  });

  it('rejects a positive initialCarryover', () => {
    expect(() =>
      runCarryoverLedger([], { initialCarryover: fraction(1, 1) }),
    ).toThrow(RangeError);
  });

  it('totalPayable always equals the sum of each period’s payable', () => {
    fc.assert(
      fc.property(fc.array(fractionArb, { maxLength: 12 }), (periods) => {
        const result = runCarryoverLedger(periods);
        const summed = result.periods.reduce(
          (sum, entry) => addFractions(sum, entry.payable),
          ZERO,
        );
        expect(result.totalPayable).toEqual(summed);
      }),
    );
  });
});
