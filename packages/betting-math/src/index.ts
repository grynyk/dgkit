/**
 * Public API of `@dgkit/betting-math`.
 *
 * Implementation helpers under `./lib` (internal composition, e.g.
 * `settlement.utils.ts`) stay private.
 */

// Exact-rational foundation
export {
  addFractions,
  compareFractions,
  divideFractions,
  fraction,
  fractionFromNumber,
  fractionToNumber,
  fractionToString,
  multiplyFractions,
  ONE,
  reduceFraction,
  subtractFractions,
  ZERO,
} from './lib/fraction';
export type { Fraction } from './lib/fraction';

// Odds format conversion
export { formatOdds, parseOdds } from './lib/odds';
export type { OddsFormat } from './lib/odds';

// Combinatorics
export { generateCombinations } from './lib/combinations';
export { countFullCoverLines, getFullCoverLines } from './lib/system-bets';

// Settlement primitives
export { reduceDeadHeatOdds } from './lib/dead-heat';
export { applyRule4Deduction, lookupRule4Deduction } from './lib/rule4';
export type { Rule4Band } from './lib/rule4';
export { collapseVoidLegs } from './lib/void-collapse';
export type { VoidCollapseResult } from './lib/void-collapse';
export { derivePlaceOdds } from './lib/each-way';

// Asian handicap
export {
  settleAsianHandicap,
  settleAsianHandicapLine,
  splitQuarterLine,
} from './lib/asian-handicap';
export type {
  AsianHandicapOutcome,
  AsianHandicapPart,
  AsianHandicapResult,
} from './lib/asian-handicap';

// Cash-out (approximation — see cash-out.ts)
export {
  estimateCashOutValue,
  estimateMultiLegCashOutValue,
} from './lib/cash-out';
export type {
  CashOutInput,
  CashOutLeg,
  MultiLegCashOutInput,
} from './lib/cash-out';

// Settlement engine
export { settleLine, settleSystemBet } from './lib/settlement';
export type {
  DeadHeatInfo,
  EachWayLeg,
  EachWayTerms,
  Leg,
  LegStatus,
  Rule4Info,
  SettleOptions,
  SettlementLine,
  SettlementResult,
} from './lib/settlement.types';
