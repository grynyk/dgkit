import { describe, expect, it } from 'vitest';

import { fraction, ONE, ZERO } from './fraction';
import { hasEachWayLine, settleCombinationPart } from './settlement.utils';
import type { Leg, Rule4Info } from './settlement.types';
import type { Rule4Band } from './rule4';

const win = (odds: [number, number] = [2, 1]): Leg => ({
  odds: fraction(...odds),
  status: 'win',
});
const lose = (odds: [number, number] = [2, 1]): Leg => ({
  odds: fraction(...odds),
  status: 'lose',
});
const voidLeg = (): Leg => ({ odds: fraction(2, 1), status: 'void' });

describe('settleCombinationPart', () => {
  const stake = fraction(1, 1);

  it('single winning leg', () => {
    const line = settleCombinationPart(
      [0],
      [win([3, 1])],
      'win',
      stake,
      undefined,
    );
    expect(line).toEqual({
      legIndices: [0],
      fold: 1,
      part: 'win',
      oddsProduct: fraction(3, 1),
      stake,
      returned: fraction(3, 1),
      voided: false,
    });
  });

  it('a single losing leg returns nothing', () => {
    const line = settleCombinationPart([0], [lose()], 'win', stake, undefined);
    expect(line.returned).toEqual(ZERO);
  });

  it('one loser in a multi-leg combination loses the whole combination', () => {
    const line = settleCombinationPart(
      [0, 1],
      [win(), lose()],
      'win',
      stake,
      undefined,
    );
    expect(line.returned).toEqual(ZERO);
    expect(line.fold).toBe(2); // both legs survived void-collapse — losing is not voiding
  });

  it('collapses a void leg, settling the survivors at the lower fold', () => {
    const line = settleCombinationPart(
      [0, 1, 2],
      [win([3, 1]), voidLeg(), win([2, 1])],
      'win',
      stake,
      undefined,
    );
    expect(line.fold).toBe(2);
    expect(line.oddsProduct).toEqual(fraction(6, 1)); // 3 * 2
    expect(line.returned).toEqual(fraction(6, 1));
    expect(line.voided).toBe(false);
  });

  it('when every leg is void, the whole line is void and stake is returned', () => {
    const line = settleCombinationPart(
      [0, 1],
      [voidLeg(), voidLeg()],
      'win',
      stake,
      undefined,
    );
    expect(line).toEqual({
      legIndices: [0, 1],
      fold: 0,
      part: 'win',
      oddsProduct: ONE,
      stake,
      returned: stake,
      voided: true,
    });
  });

  it('applies dead-heat reduction before computing the odds product', () => {
    const legWithDeadHeat: Leg = {
      odds: fraction(4, 1),
      status: 'win',
      deadHeat: { tiedCount: 2 },
    };
    const line = settleCombinationPart(
      [0],
      [legWithDeadHeat],
      'win',
      stake,
      undefined,
    );
    expect(line.oddsProduct).toEqual(fraction(5, 2)); // (4-1)/2 + 1
  });

  it('applies an explicit Rule 4 deduction without needing a table', () => {
    const rule4: readonly Rule4Info[] = [
      { kind: 'explicit', deductionPence: 25 },
    ];
    const leg: Leg = { odds: fraction(3, 1), status: 'win', rule4 };
    const line = settleCombinationPart([0], [leg], 'win', stake, undefined);
    expect(line.oddsProduct).toEqual(fraction(5, 2)); // 3.0 with 25p deduction -> 2.5
  });

  it('applies a lookup Rule 4 deduction using the supplied table', () => {
    const table: readonly Rule4Band[] = [
      { maxDecimalOdds: 2, deductionPence: 25 },
    ];
    const rule4: readonly Rule4Info[] = [
      { kind: 'lookup', withdrawnOdds: fraction(3, 2) },
    ];
    const leg: Leg = { odds: fraction(3, 1), status: 'win', rule4 };
    const line = settleCombinationPart([0], [leg], 'win', stake, table);
    expect(line.oddsProduct).toEqual(fraction(5, 2));
  });

  it('throws when a lookup Rule 4 deduction has no table', () => {
    const rule4: readonly Rule4Info[] = [
      { kind: 'lookup', withdrawnOdds: fraction(3, 2) },
    ];
    const leg: Leg = { odds: fraction(3, 1), status: 'win', rule4 };
    expect(() =>
      settleCombinationPart([0], [leg], 'win', stake, undefined),
    ).toThrow(RangeError);
  });

  it('settles the place part using each-way terms, independent of the win status', () => {
    const leg: Leg = {
      odds: fraction(9, 1),
      status: 'lose', // lost the win part...
      eachWay: {
        terms: { placeFraction: fraction(1, 4), places: 3 },
        placeStatus: 'win',
      }, // ...but placed
    };
    const line = settleCombinationPart([0], [leg], 'place', stake, undefined);
    expect(line.oddsProduct).toEqual(fraction(3, 1)); // 1 + (9-1) * 1/4
    expect(line.returned).toEqual(fraction(3, 1));
  });

  it('throws when the place part is requested for a leg with no eachWay terms', () => {
    expect(() =>
      settleCombinationPart([0], [win()], 'place', stake, undefined),
    ).toThrow(RangeError);
  });
});

describe('hasEachWayLine', () => {
  const ewLeg: Leg = {
    odds: fraction(2, 1),
    status: 'win',
    eachWay: {
      terms: { placeFraction: fraction(1, 4), places: 3 },
      placeStatus: 'win',
    },
  };

  it('true only when every leg in the combination has eachWay terms', () => {
    expect(hasEachWayLine([0, 1], [ewLeg, ewLeg])).toBe(true);
    expect(hasEachWayLine([0, 1], [ewLeg, win()])).toBe(false);
  });

  it('false for an empty combination', () => {
    expect(hasEachWayLine([], [])).toBe(false);
  });
});
