import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { fraction, fractionToNumber } from './fraction';
import { derivePlaceOdds } from './each-way';

describe('derivePlaceOdds', () => {
  it('9/1 at quarter odds -> 3/1 place odds', () => {
    expect(derivePlaceOdds(fraction(9, 1), fraction(1, 4))).toEqual(
      fraction(3, 1),
    );
  });

  it('9/1 at fifth odds -> 13/5 place odds', () => {
    expect(derivePlaceOdds(fraction(9, 1), fraction(1, 5))).toEqual(
      fraction(13, 5),
    );
  });

  it('a placeFraction of 1 makes place odds equal win odds', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 10_000 }), (num) => {
        expect(derivePlaceOdds(fraction(num, 1), fraction(1, 1))).toEqual(
          fraction(num, 1),
        );
      }),
    );
  });

  it('place odds are always <= win odds for placeFraction in (0, 1]', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10_000 }),
        fc.integer({ min: 1, max: 10 }),
        (num, denom) => {
          const placeFraction = fraction(1, denom);
          const winOdds = fraction(num, 1);
          expect(
            fractionToNumber(derivePlaceOdds(winOdds, placeFraction)),
          ).toBeLessThanOrEqual(fractionToNumber(winOdds));
        },
      ),
    );
  });
});
