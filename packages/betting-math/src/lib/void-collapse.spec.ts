import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { collapseVoidLegs } from './void-collapse';

describe('collapseVoidLegs', () => {
  it('drops void legs, keeping the rest in order', () => {
    const result = collapseVoidLegs(['a', 'b', 'c'], [false, true, false]);
    expect(result).toEqual({ legs: ['a', 'c'], allVoid: false });
  });

  it('reports allVoid when every leg is void', () => {
    const result = collapseVoidLegs(['a', 'b'], [true, true]);
    expect(result).toEqual({ legs: [], allVoid: true });
  });

  it('is a no-op when nothing is void', () => {
    const result = collapseVoidLegs(['a', 'b'], [false, false]);
    expect(result).toEqual({ legs: ['a', 'b'], allVoid: false });
  });

  it('handles an empty combination', () => {
    expect(collapseVoidLegs([], [])).toEqual({ legs: [], allVoid: true });
  });

  it('throws when legs and isVoid have different lengths', () => {
    expect(() => collapseVoidLegs(['a', 'b'], [true])).toThrow(RangeError);
  });

  it('surviving legs is always a subset preserving relative order', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer(), { minLength: 0, maxLength: 10 }),
        (legs) => {
          const isVoid = legs.map((n) => n % 2 === 0);
          const { legs: surviving, allVoid } = collapseVoidLegs(legs, isVoid);
          const expected = legs.filter((n) => n % 2 !== 0);
          expect(surviving).toEqual(expected);
          expect(allVoid).toBe(surviving.length === 0);
        },
      ),
    );
  });
});
