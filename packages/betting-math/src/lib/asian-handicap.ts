import {
  addFractions,
  divideFractions,
  fraction,
  multiplyFractions,
  ZERO,
  type Fraction,
} from './fraction';

/** The outcome of one whole/half Asian handicap line. */
export type AsianHandicapOutcome = 'win' | 'push' | 'lose';

/**
 * Split a quarter-goal handicap line into its two adjacent whole/half lines.
 *
 * ```ts
 * splitQuarterLine(-0.25); // [-0.5, 0]
 * splitQuarterLine(0.75);  // [0.5, 1]
 * splitQuarterLine(-0.5);  // [-0.5]  — already a plain line, nothing to split
 * ```
 *
 * A quarter line (`…, -0.75, -0.25, 0.25, 0.75, …`) isn't a single bet — the
 * stake splits in half across the two adjacent lines, each settled
 * independently (see {@link settleAsianHandicap}). Whole and half lines
 * return themselves as a one-element tuple.
 *
 * Throws if `line` is not a multiple of `0.25`.
 */
export function splitQuarterLine(
  line: number,
): readonly [number] | readonly [number, number] {
  const quarters = line * 4;
  if (!Number.isInteger(quarters)) {
    throw new RangeError(
      `splitQuarterLine: ${line} is not a multiple of 0.25.`,
    );
  }
  if (quarters % 2 === 0) {
    return [line];
  }
  return [line - 0.25, line + 0.25];
}

function requireWholeOrHalfLine(line: number, context: string): void {
  if (!Number.isInteger(line * 2)) {
    throw new RangeError(
      `${context}: ${line} is a quarter line — use settleAsianHandicap, which splits it automatically.`,
    );
  }
}

/**
 * Settle a single whole or half Asian handicap line.
 *
 * `adjusted = scoreDiff + line`, from the backed side's perspective (e.g.
 * backing a team at `-0.5` and it wins `1-0` gives `scoreDiff = 1`,
 * `adjusted = 0.5 > 0` — a win). `adjusted > 0` wins, `adjusted === 0`
 * pushes (stake returned, no profit), `adjusted < 0` loses.
 *
 * Throws if `line` is a quarter line — quarter lines have no single
 * outcome; use {@link settleAsianHandicap}.
 */
export function settleAsianHandicapLine(
  line: number,
  scoreDiff: number,
  stake: Fraction,
  odds: Fraction,
): { readonly outcome: AsianHandicapOutcome; readonly returned: Fraction } {
  requireWholeOrHalfLine(line, 'settleAsianHandicapLine');
  const adjusted = scoreDiff + line;
  if (adjusted > 0) {
    return { outcome: 'win', returned: multiplyFractions(stake, odds) };
  }
  if (adjusted === 0) {
    return { outcome: 'push', returned: stake };
  }
  return { outcome: 'lose', returned: ZERO };
}

/** One half (or the whole, for a non-quarter line) of a settled Asian handicap bet. */
export interface AsianHandicapPart {
  readonly line: number;
  readonly outcome: AsianHandicapOutcome;
  readonly stake: Fraction;
  readonly returned: Fraction;
}

/** The full result of settling an Asian handicap bet, quarter line or not. */
export interface AsianHandicapResult {
  readonly parts: readonly AsianHandicapPart[];
  readonly totalReturned: Fraction;
}

/**
 * Settle an Asian handicap bet at any line — whole, half, or quarter.
 *
 * A quarter line splits `stake` in half across
 * {@link splitQuarterLine}'s two adjacent lines, settles each
 * independently, and sums the result — producing the informal "half win",
 * "half push" outcomes without needing a dedicated outcome label for them:
 * `parts` carries each half's own real outcome, and `totalReturned` is the
 * net financial effect.
 */
export function settleAsianHandicap(
  line: number,
  scoreDiff: number,
  stake: Fraction,
  odds: Fraction,
): AsianHandicapResult {
  const lines = splitQuarterLine(line);
  const partStake =
    lines.length === 1 ? stake : divideFractions(stake, fraction(2));

  const parts: AsianHandicapPart[] = lines.map((l) => {
    const { outcome, returned } = settleAsianHandicapLine(
      l,
      scoreDiff,
      partStake,
      odds,
    );
    return { line: l, outcome, stake: partStake, returned };
  });

  const totalReturned = parts.reduce(
    (sum, part) => addFractions(sum, part.returned),
    ZERO,
  );
  return { parts, totalReturned };
}
