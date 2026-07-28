import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { fraction, fractionToNumber, subtractFractions } from './fraction';
import { settleLine, settleSystemBet } from './settlement';
import type { Leg } from './settlement.types';

const win = (odds: [number, number] = [2, 1]): Leg => ({
  odds: fraction(...odds),
  status: 'win',
});
const lose = (odds: [number, number] = [2, 1]): Leg => ({
  odds: fraction(...odds),
  status: 'lose',
});
const voidLeg = (): Leg => ({ odds: fraction(2, 1), status: 'void' });

describe('settleLine', () => {
  const stake = fraction(1, 1);

  it('settles a plain accumulator (no each-way): only a win line', () => {
    const result = settleLine([win([2, 1]), win([3, 1])], stake);
    expect(result.win.returned).toEqual(fraction(6, 1));
    expect(result.place).toBeUndefined();
  });

  it('returns a place line only when every leg has each-way terms', () => {
    const ewLeg: Leg = {
      odds: fraction(9, 1),
      status: 'win',
      eachWay: {
        terms: { placeFraction: fraction(1, 4), places: 3 },
        placeStatus: 'win',
      },
    };
    const result = settleLine([ewLeg], stake);
    expect(result.place).toBeDefined();
  });
});

describe('settleSystemBet', () => {
  const stake = fraction(1, 1);

  it('generates exactly the lines getFullCoverLines would, matching a Yankee’s line count', () => {
    const legs = [win(), win(), win(), win()];
    const result = settleSystemBet([2, 3, 4], legs, stake);
    expect(result.lines).toHaveLength(11); // 6 doubles + 4 trebles + 1 fourfold
  });

  it('every leg losing means total returned is zero and profit is -totalStaked', () => {
    const legs = [lose(), lose(), lose()];
    const result = settleSystemBet([2, 3], legs, stake); // a Trixie: 4 lines
    expect(result.totalStaked).toEqual(fraction(4, 1));
    expect(result.totalReturned).toEqual(fraction(0, 1));
    expect(result.profit).toEqual(fraction(-4, 1));
  });

  it('every leg winning means every line wins', () => {
    const legs = [win([2, 1]), win([2, 1]), win([2, 1])];
    const result = settleSystemBet([2, 3], legs, stake); // Trixie: 3 doubles (2*2=4) + 1 treble (2*2*2=8)
    // 3 doubles at 4 + 1 treble at 8 = 12 + 8 = 20
    expect(result.totalReturned).toEqual(fraction(20, 1));
  });

  it('Lucky 15, two void legs and a dead heat on a third: hand-verified against the full 15-line breakdown', () => {
    // A, B void. C wins outright at 3/1 (decimal 4). D wins at 3/1 (decimal
    // 4) but dead-heats with one other runner, halving its profit to 2/1
    // (decimal 2.5).
    const legs: readonly Leg[] = [
      voidLeg(),
      voidLeg(),
      { odds: fraction(4, 1), status: 'win' },
      { odds: fraction(4, 1), status: 'win', deadHeat: { tiedCount: 2 } },
    ];

    const result = settleSystemBet([1, 2, 3, 4], legs, stake); // Lucky 15: 15 lines

    expect(result.lines).toHaveLength(15);
    expect(result.totalStaked).toEqual(fraction(15, 1));

    // Hand-computed total (see PR description / commit for the full
    // per-line breakdown): singles 8.5 + doubles 24 + trebles 26.5 +
    // fourfold 10 = 69.
    expect(fractionToNumber(result.totalReturned)).toBeCloseTo(69, 9);
    expect(fractionToNumber(result.profit)).toBeCloseTo(54, 9);

    // Spot-check a few individual lines against the hand computation.
    const bySingleLeg = (index: number) =>
      result.lines.find(
        (l) => l.legIndices.length === 1 && l.legIndices[0] === index,
      );
    expect(bySingleLeg(0)?.voided).toBe(true); // A alone: void, stake back
    expect(fractionToNumber(bySingleLeg(0)!.returned)).toBeCloseTo(1, 9);
    expect(fractionToNumber(bySingleLeg(2)!.returned)).toBeCloseTo(4, 9); // C alone: 1 * 4
    expect(fractionToNumber(bySingleLeg(3)!.returned)).toBeCloseTo(2.5, 9); // D alone, dead-heat-reduced

    const fourfold = result.lines.find((l) => l.legIndices.length === 4);
    // A, B collapse away; survivors C, D at 4 * 2.5 = 10.
    expect(fourfold?.fold).toBe(2);
    expect(fractionToNumber(fourfold!.returned)).toBeCloseTo(10, 9);
  });

  it('an each-way system bet settles a place line for every combination', () => {
    const ewWin = (odds: [number, number]): Leg => ({
      odds: fraction(...odds),
      status: 'win',
      eachWay: {
        terms: { placeFraction: fraction(1, 4), places: 3 },
        placeStatus: 'win',
      },
    });
    const legs = [ewWin([9, 1]), ewWin([9, 1])];
    const result = settleSystemBet([2], legs, stake); // one double: win line + place line
    expect(result.lines).toHaveLength(2);
    expect(result.lines.map((l) => l.part).sort()).toEqual(['place', 'win']);
    // place: (1 + 8/4) * (1 + 8/4) = 3 * 3 = 9
    const place = result.lines.find((l) => l.part === 'place');
    expect(fractionToNumber(place!.returned)).toBeCloseTo(9, 9);
  });

  it('totalReturned - totalStaked always equals profit, for arbitrary win/lose/void legs', () => {
    const legArb: fc.Arbitrary<Leg> = fc
      .tuple(
        fc.integer({ min: 2, max: 20 }),
        fc.constantFrom<'win' | 'lose' | 'void'>('win', 'lose', 'void'),
      )
      .map(([oddsNum, status]) => ({ odds: fraction(oddsNum, 1), status }));

    fc.assert(
      fc.property(fc.array(legArb, { minLength: 1, maxLength: 5 }), (legs) => {
        const folds = Array.from({ length: legs.length }, (_, i) => i + 1);
        const result = settleSystemBet(folds, legs, stake);
        expect(
          fractionToNumber(
            subtractFractions(result.totalReturned, result.totalStaked),
          ),
        ).toBeCloseTo(fractionToNumber(result.profit), 9);
      }),
    );
  });
});
