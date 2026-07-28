import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { fraction, fractionToNumber, ZERO } from './fraction';
import { estimateCashOutValue, estimateMultiLegCashOutValue } from './cash-out';

describe('estimateCashOutValue', () => {
  it('with zero margin, shorter current odds increase the cash-out value above stake', () => {
    // Placed at 5/1, now 2/1 (shorter/more likely): cashing out is worth more than the stake.
    const value = estimateCashOutValue({
      placedOdds: fraction(6, 1),
      currentOdds: fraction(3, 1),
      stake: fraction(10, 1),
      margin: 0,
    });
    expect(value).toEqual(fraction(20, 1));
  });

  it('with zero margin, longer current odds decrease the cash-out value below stake', () => {
    const value = estimateCashOutValue({
      placedOdds: fraction(3, 1),
      currentOdds: fraction(6, 1),
      stake: fraction(10, 1),
      margin: 0,
    });
    expect(value).toEqual(fraction(5, 1));
  });

  it('unchanged odds with zero margin returns exactly the stake', () => {
    const value = estimateCashOutValue({
      placedOdds: fraction(3, 1),
      currentOdds: fraction(3, 1),
      stake: fraction(10, 1),
      margin: 0,
    });
    expect(value).toEqual(fraction(10, 1));
  });

  it('a positive margin reduces the estimate below the zero-margin fair value', () => {
    const fair = estimateCashOutValue({
      placedOdds: fraction(6, 1),
      currentOdds: fraction(3, 1),
      stake: fraction(10, 1),
      margin: 0,
    });
    const withMargin = estimateCashOutValue({
      placedOdds: fraction(6, 1),
      currentOdds: fraction(3, 1),
      stake: fraction(10, 1),
      margin: 0.1,
    });
    expect(fractionToNumber(withMargin)).toBeLessThan(fractionToNumber(fair));
    expect(fractionToNumber(withMargin)).toBeCloseTo(18, 9); // 20 * (1 - 0.1)
  });

  it('rejects a margin outside [0, 1)', () => {
    const base = {
      placedOdds: fraction(2, 1),
      currentOdds: fraction(2, 1),
      stake: fraction(10, 1),
    };
    expect(() => estimateCashOutValue({ ...base, margin: -0.01 })).toThrow(
      RangeError,
    );
    expect(() => estimateCashOutValue({ ...base, margin: 1 })).toThrow(
      RangeError,
    );
  });

  it('the value is always non-negative for any valid input', () => {
    // "Nice" 2-decimal-place margins (e.g. 0.05 for 5%) — a real margin is a
    // configured percentage, not an arbitrary float, and fractionFromNumber
    // (by design — see fraction.ts) rejects values that stringify to
    // exponential notation, which fc.double's extremes can produce.
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10_000 }),
        fc.integer({ min: 2, max: 10_000 }),
        fc.integer({ min: 1, max: 10_000 }),
        fc.integer({ min: 0, max: 99 }).map((n) => n / 100),
        (placed, current, stake, margin) => {
          const value = estimateCashOutValue({
            placedOdds: fraction(placed, 1),
            currentOdds: fraction(current, 1),
            stake: fraction(stake, 1),
            margin,
          });
          expect(fractionToNumber(value)).toBeGreaterThanOrEqual(0);
        },
      ),
    );
  });
});

describe('estimateMultiLegCashOutValue', () => {
  const stake = fraction(10, 1);

  it('a lose leg makes the whole bet worth zero, regardless of other legs', () => {
    const value = estimateMultiLegCashOutValue({
      stake,
      margin: 0,
      legs: [
        { placedOdds: fraction(2, 1), settled: 'win' },
        { placedOdds: fraction(2, 1), settled: 'lose' },
        { placedOdds: fraction(2, 1), currentOdds: fraction(2, 1) },
      ],
    });
    expect(value).toEqual(ZERO);
  });

  it('a void leg is excluded from the product', () => {
    const withVoid = estimateMultiLegCashOutValue({
      stake,
      margin: 0,
      legs: [
        { placedOdds: fraction(2, 1), settled: 'win' },
        { placedOdds: fraction(99, 1), settled: 'void' },
      ],
    });
    const withoutVoidLeg = estimateMultiLegCashOutValue({
      stake,
      margin: 0,
      legs: [{ placedOdds: fraction(2, 1), settled: 'win' }],
    });
    expect(withVoid).toEqual(withoutVoidLeg);
  });

  it('a won leg contributes its fixed placedOdds, ignoring any currentOdds', () => {
    const value = estimateMultiLegCashOutValue({
      stake,
      margin: 0,
      legs: [
        {
          placedOdds: fraction(3, 1),
          currentOdds: fraction(999, 1),
          settled: 'win',
        },
      ],
    });
    expect(value).toEqual(fraction(30, 1));
  });

  it('an unsettled leg contributes placedOdds / currentOdds', () => {
    const value = estimateMultiLegCashOutValue({
      stake,
      margin: 0,
      legs: [{ placedOdds: fraction(6, 1), currentOdds: fraction(3, 1) }],
    });
    expect(value).toEqual(fraction(20, 1));
  });

  it('throws when an unsettled leg is missing currentOdds', () => {
    expect(() =>
      estimateMultiLegCashOutValue({
        stake,
        margin: 0,
        legs: [{ placedOdds: fraction(2, 1) }],
      }),
    ).toThrow(RangeError);
  });

  it('multiplies contributions across several legs', () => {
    const value = estimateMultiLegCashOutValue({
      stake: fraction(1, 1),
      margin: 0,
      legs: [
        { placedOdds: fraction(2, 1), settled: 'win' }, // contributes 2
        { placedOdds: fraction(6, 1), currentOdds: fraction(3, 1) }, // contributes 2
      ],
    });
    expect(value).toEqual(fraction(4, 1));
  });

  it('rejects a margin outside [0, 1)', () => {
    expect(() =>
      estimateMultiLegCashOutValue({
        stake,
        margin: 1,
        legs: [{ placedOdds: fraction(2, 1), settled: 'win' }],
      }),
    ).toThrow(RangeError);
  });

  it('rejects an invalid margin even when a lose leg would otherwise short-circuit to zero', () => {
    expect(() =>
      estimateMultiLegCashOutValue({
        stake,
        margin: 1,
        legs: [{ placedOdds: fraction(2, 1), settled: 'lose' }],
      }),
    ).toThrow(RangeError);
  });
});
