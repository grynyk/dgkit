import type { Fraction } from './fraction';
import type { Rule4Band } from './rule4';

/** The outcome of a leg (or the place part of an each-way leg). */
export type LegStatus = 'win' | 'lose' | 'void';

/** A leg tied with other runners for its placing. */
export interface DeadHeatInfo {
  readonly tiedCount: number;
}

/**
 * A Rule 4 deduction affecting a leg — either looked up from a caller-
 * supplied table by the withdrawn runner's price, or given directly as an
 * already-known percentage.
 */
export type Rule4Info =
  | { readonly kind: 'lookup'; readonly withdrawnOdds: Fraction }
  | { readonly kind: 'explicit'; readonly deductionPence: number };

/** Each-way place terms, e.g. "1/4 odds, 3 places". */
export interface EachWayTerms {
  readonly placeFraction: Fraction;
  readonly places: number;
}

/** The each-way place side of a leg, settled independently of its win side. */
export interface EachWayLeg {
  readonly terms: EachWayTerms;
  readonly placeStatus: LegStatus;
  /** A dead heat affecting the place position specifically — independent of {@link Leg.deadHeat}. */
  readonly deadHeat?: DeadHeatInfo;
}

/** One selection in a bet. */
export interface Leg {
  /** Canonical decimal odds (see `odds.ts`'s `parseOdds`). */
  readonly odds: Fraction;
  readonly status: LegStatus;
  /** A dead heat affecting the win position. */
  readonly deadHeat?: DeadHeatInfo;
  /**
   * Rule 4 deductions applying to this leg (win and place alike — a
   * withdrawal's deduction applies to both). Multiple entries compound
   * sequentially (rare, but real: two withdrawals in the same race).
   */
  readonly rule4?: readonly Rule4Info[];
  /** Present when this leg is backed each-way. */
  readonly eachWay?: EachWayLeg;
}

/** One settled line — a specific fold combination, for one part (win or place). */
export interface SettlementLine {
  /** Indices into the original `legs` array making up this combination. */
  readonly legIndices: readonly number[];
  /** The number of legs actually settled, after void-leg collapse (`0` if the whole line voided). */
  readonly fold: number;
  readonly part: 'win' | 'place';
  /** Product of the surviving legs' effective odds (dead-heat- and Rule-4-adjusted). `1` if voided. */
  readonly oddsProduct: Fraction;
  readonly stake: Fraction;
  readonly returned: Fraction;
  /** `true` when every leg in this combination was void — `stake` was simply returned. */
  readonly voided: boolean;
}

/** Options for `settleLine` / `settleSystemBet`. */
export interface SettleOptions {
  /**
   * Required only if a leg's Rule 4 deduction uses `{ kind: 'lookup' }` —
   * see `rule4.ts`. This package ships no default table.
   */
  readonly rule4Table?: readonly Rule4Band[];
}

/** The full result of settling a system bet. */
export interface SettlementResult {
  readonly lines: readonly SettlementLine[];
  readonly totalStaked: Fraction;
  readonly totalReturned: Fraction;
  readonly profit: Fraction;
}
