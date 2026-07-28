import {
  divideFractions,
  fractionFromNumber,
  multiplyFractions,
  subtractFractions,
  ONE,
  ZERO,
  type Fraction,
} from './fraction';

/**
 * **Approximation, not a rule.** Unlike every other calculation in this
 * package, cash-out has no single correct answer — real bookmakers apply a
 * proprietary margin on top of fair value, and reserve full discretion over
 * the price they'll actually offer. What follows is the standard fair-value
 * estimate (present value of the bet at current market odds), with an
 * explicit `margin` you must supply to approximate a real book's haircut.
 * Treat the result as a reference figure, not a guarantee.
 */
export interface CashOutInput {
  /** The odds the bet was originally placed at. */
  readonly placedOdds: Fraction;
  /** The current market odds for the same outcome. */
  readonly currentOdds: Fraction;
  readonly stake: Fraction;
  /** Bookmaker margin taken off fair value, as a fraction in `[0, 1)`. */
  readonly margin: number;
}

/**
 * Fair-value cash-out estimate for a single (unsettled) bet.
 *
 * `cashOutValue = stake × (placedOdds / currentOdds) × (1 − margin)` — if
 * the market now prices the outcome shorter (more likely) than when the bet
 * was placed, `placedOdds / currentOdds > 1` and the cash-out value exceeds
 * the stake; if the market has drifted the other way, it's worth less.
 */
export function estimateCashOutValue(input: CashOutInput): Fraction {
  const fairValue = multiplyFractions(
    input.stake,
    divideFractions(input.placedOdds, input.currentOdds),
  );
  return applyMargin(fairValue, input.margin);
}

/** One leg of a multi-leg (accumulator) bet, for {@link estimateMultiLegCashOutValue}. */
export interface CashOutLeg {
  readonly placedOdds: Fraction;
  /** Required for a leg that has not yet settled; ignored otherwise. */
  readonly currentOdds?: Fraction;
  /** Omit for a leg still running. */
  readonly settled?: 'win' | 'lose' | 'void';
}

export interface MultiLegCashOutInput {
  readonly legs: readonly CashOutLeg[];
  readonly stake: Fraction;
  readonly margin: number;
}

/**
 * Fair-value cash-out estimate for a multi-leg accumulator with a mix of
 * settled and still-running legs. See {@link CashOutInput} — the same
 * approximation caveat applies.
 *
 * - A `'lose'` leg makes the whole bet worth `0` — one loser voids an
 *   accumulator regardless of the other legs.
 * - A `'void'` leg is excluded, matching how void-leg collapse works
 *   elsewhere in this package (see `void-collapse.ts`): it simply doesn't
 *   participate in the odds product.
 * - A `'win'` leg contributes its fixed `placedOdds` (its price is locked
 *   in — there is no more uncertainty to price).
 * - An unsettled leg contributes `placedOdds / currentOdds`, same as the
 *   single-bet case, and requires `currentOdds`.
 *
 * The product of every surviving leg's contribution, times `stake`, times
 * `(1 − margin)`, is the estimate.
 */
export function estimateMultiLegCashOutValue(
  input: MultiLegCashOutInput,
): Fraction {
  requireValidMargin(input.margin);

  let product = ONE;
  for (const leg of input.legs) {
    if (leg.settled === 'lose') {
      return ZERO;
    }
    if (leg.settled === 'void') {
      continue;
    }
    if (leg.settled === 'win') {
      product = multiplyFractions(product, leg.placedOdds);
      continue;
    }
    if (!leg.currentOdds) {
      throw new RangeError(
        'estimateMultiLegCashOutValue: an unsettled leg requires currentOdds.',
      );
    }
    product = multiplyFractions(
      product,
      divideFractions(leg.placedOdds, leg.currentOdds),
    );
  }

  return applyMargin(multiplyFractions(input.stake, product), input.margin);
}

function requireValidMargin(margin: number): void {
  if (!(margin >= 0) || margin >= 1) {
    throw new RangeError(`margin must be in [0, 1), got ${margin}.`);
  }
}

function applyMargin(fairValue: Fraction, margin: number): Fraction {
  requireValidMargin(margin);
  return multiplyFractions(
    fairValue,
    subtractFractions(ONE, fractionFromNumber(margin)),
  );
}
