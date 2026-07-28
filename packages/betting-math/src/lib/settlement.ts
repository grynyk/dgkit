import {
  addFractions,
  subtractFractions,
  ZERO,
  type Fraction,
} from './fraction';
import { getFullCoverLines } from './system-bets';
import { hasEachWayLine, settleCombinationPart } from './settlement.utils';
import type {
  Leg,
  SettleOptions,
  SettlementLine,
  SettlementResult,
} from './settlement.types';

/**
 * Settle a single combination of legs — a plain single/double/treble/etc.
 * accumulator, or one line of a larger system bet.
 *
 * ```ts
 * const { win } = settleLine([legA, legB], stake);
 * win.returned; // Fraction
 * ```
 *
 * Returns a `place` line too when every leg in `legs` carries each-way
 * terms. See `settlement.types.ts`'s `Leg` for what each leg needs (odds,
 * status, and optionally dead heat / Rule 4 / each-way info), and
 * `SettleOptions.rule4Table` if any leg uses a Rule 4 lookup.
 */
export function settleLine(
  legs: readonly Leg[],
  stake: Fraction,
  options: SettleOptions = {},
): { readonly win: SettlementLine; readonly place?: SettlementLine } {
  const legIndices = legs.map((_, i) => i);
  const win = settleCombinationPart(
    legIndices,
    legs,
    'win',
    stake,
    options.rule4Table,
  );
  if (!hasEachWayLine(legIndices, legs)) {
    return { win };
  }
  const place = settleCombinationPart(
    legIndices,
    legs,
    'place',
    stake,
    options.rule4Table,
  );
  return { win, place };
}

/**
 * Settle a full-cover system bet: every `k`-fold combination of `legs`, for
 * each `k` in `folds`, at `unitStake` per line.
 *
 * ```ts
 * // A £1 Trixie over 3 legs: 3 doubles + 1 treble, £1 on each of the 4 lines.
 * const result = settleSystemBet([2, 3], legs, fraction(1, 1));
 * result.totalReturned;
 * result.lines; // every line, including voided ones, for auditability
 * ```
 *
 * `unitStake` applies to *each* line independently — including, for an
 * each-way combination, to *each* of its win and place lines separately
 * (the standard "£1 each-way Trixie" convention: £1 on every win line *and*
 * £1 on every place line, so total outlay is `2 × lines × unitStake` for a
 * fully each-way bet).
 *
 * See {@link settleLine} for what each `Leg` needs, and
 * {@link getFullCoverLines} (`system-bets.ts`) for how `folds` maps to
 * common system-bet names (Trixie, Yankee, …) — this package ships no
 * named-system table; see the README's recipes.
 */
export function settleSystemBet(
  folds: readonly number[],
  legs: readonly Leg[],
  unitStake: Fraction,
  options: SettleOptions = {},
): SettlementResult {
  const combinations = getFullCoverLines(legs.length, folds);
  const lines: SettlementLine[] = [];

  for (const legIndices of combinations) {
    lines.push(
      settleCombinationPart(
        legIndices,
        legs,
        'win',
        unitStake,
        options.rule4Table,
      ),
    );
    if (hasEachWayLine(legIndices, legs)) {
      lines.push(
        settleCombinationPart(
          legIndices,
          legs,
          'place',
          unitStake,
          options.rule4Table,
        ),
      );
    }
  }

  const totalStaked = lines.reduce(
    (sum, line) => addFractions(sum, line.stake),
    ZERO,
  );
  const totalReturned = lines.reduce(
    (sum, line) => addFractions(sum, line.returned),
    ZERO,
  );
  return {
    lines,
    totalStaked,
    totalReturned,
    profit: subtractFractions(totalReturned, totalStaked),
  };
}
