import {
  applyRule4Deduction,
  lookupRule4Deduction,
  type Rule4Band,
} from './rule4';
import { collapseVoidLegs } from './void-collapse';
import { derivePlaceOdds } from './each-way';
import { multiplyFractions, ONE, ZERO, type Fraction } from './fraction';
import { reduceDeadHeatOdds } from './dead-heat';
import type {
  DeadHeatInfo,
  Leg,
  LegStatus,
  SettlementLine,
} from './settlement.types';

interface ResolvedLeg {
  readonly status: LegStatus;
  readonly odds: Fraction;
}

function requireRule4Table(
  table: readonly Rule4Band[] | undefined,
): readonly Rule4Band[] {
  if (!table) {
    throw new RangeError(
      'A leg specifies a Rule 4 lookup deduction, but no rule4Table was provided in options.',
    );
  }
  return table;
}

/**
 * Resolve one leg's effective status and odds for a given part, applying
 * dead-heat reduction and any Rule 4 deductions in order.
 */
function resolveLegForPart(
  leg: Leg,
  part: 'win' | 'place',
  rule4Table: readonly Rule4Band[] | undefined,
): ResolvedLeg {
  let status: LegStatus;
  let odds: Fraction;
  let deadHeat: DeadHeatInfo | undefined;

  if (part === 'win') {
    status = leg.status;
    odds = leg.odds;
    deadHeat = leg.deadHeat;
  } else {
    const eachWay = leg.eachWay;
    if (!eachWay) {
      throw new RangeError(
        'resolveLegForPart: the "place" part requires a leg with eachWay terms.',
      );
    }
    status = eachWay.placeStatus;
    odds = derivePlaceOdds(leg.odds, eachWay.terms.placeFraction);
    deadHeat = eachWay.deadHeat;
  }

  if (deadHeat) {
    odds = reduceDeadHeatOdds(odds, deadHeat.tiedCount);
  }

  for (const info of leg.rule4 ?? []) {
    const deductionPence =
      info.kind === 'explicit'
        ? info.deductionPence
        : lookupRule4Deduction(
            info.withdrawnOdds,
            requireRule4Table(rule4Table),
          );
    odds = applyRule4Deduction(odds, deductionPence);
  }

  return { status, odds };
}

/**
 * Settle one fold combination (a specific set of leg indices) for one part.
 *
 * Applies void-leg collapse first: legs that are void for this part are
 * dropped, and the combination settles at the lower surviving fold. If
 * every leg is void, the whole line is void and the stake is returned.
 */
export function settleCombinationPart(
  legIndices: readonly number[],
  legs: readonly Leg[],
  part: 'win' | 'place',
  stake: Fraction,
  rule4Table: readonly Rule4Band[] | undefined,
): SettlementLine {
  const resolved = legIndices.map((i) =>
    resolveLegForPart(legs[i], part, rule4Table),
  );
  const isVoid = resolved.map((r) => r.status === 'void');
  const { legs: survivors, allVoid } = collapseVoidLegs(resolved, isVoid);

  if (allVoid) {
    return {
      legIndices,
      fold: 0,
      part,
      oddsProduct: ONE,
      stake,
      returned: stake,
      voided: true,
    };
  }

  const oddsProduct = survivors.reduce(
    (product, r) => multiplyFractions(product, r.odds),
    ONE,
  );
  const allWin = survivors.every((r) => r.status === 'win');
  const returned = allWin ? multiplyFractions(stake, oddsProduct) : ZERO;

  return {
    legIndices,
    fold: survivors.length,
    part,
    oddsProduct,
    stake,
    returned,
    voided: false,
  };
}

/** Whether every leg in a combination is backed each-way — i.e. this combination also has a place line. */
export function hasEachWayLine(
  legIndices: readonly number[],
  legs: readonly Leg[],
): boolean {
  return (
    legIndices.length > 0 &&
    legIndices.every((i) => legs[i].eachWay !== undefined)
  );
}
