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
  maxFraction,
  minFraction,
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

// Market analysis — implied probability, overround, de-vigged fair odds
export {
  calculateFairOdds,
  calculateFairProbabilities,
  calculateOverround,
  impliedProbability,
} from './lib/market';

// Arbitrage (surebet) detection and stake-splitting
export { calculateArbitrageStakes, detectArbitrage } from './lib/arbitrage';
export type { ArbitrageLine, ArbitrageResult } from './lib/arbitrage';

// Expected value and edge
export { calculateEdge, calculateExpectedValue } from './lib/expected-value';
export type { ExpectedValueResult } from './lib/expected-value';

// Kelly criterion staking
export { calculateKellyStake } from './lib/kelly';
export type { KellyResult } from './lib/kelly';

// Parlay (accumulator) expected value and Kelly staking
export {
  calculateParlayExpectedValue,
  calculateParlayKellyStake,
  combineParlayLegs,
} from './lib/parlay';
export type {
  ParlayExpectedValueResult,
  ParlayKellyResult,
  ParlayLeg,
  ParlayPrice,
} from './lib/parlay';

// Hedging / green-up (cash back-to-back, and exchange back-to-lay with commission)
export { calculateExchangeLayStake, calculateHedgeStake } from './lib/hedge';
export type { ExchangeLayResult, HedgeResult } from './lib/hedge';

// Matched-betting free-bet (stake-not-returned) extraction
export { calculateFreeBetLayStake } from './lib/free-bet';
export type { FreeBetLayResult } from './lib/free-bet';

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

// Affiliate commission economics
export {
  applyNegativeCarryover,
  calculateCpaCommission,
  calculateHybridCommission,
  calculateRevShareCommission,
  runCarryoverLedger,
} from './lib/affiliate';
export type {
  CarryoverLedgerEntry,
  CarryoverLedgerOptions,
  CarryoverLedgerResult,
  CarryoverResult,
  HybridCommissionInput,
  HybridCommissionResult,
  NegativeCarryoverOptions,
} from './lib/affiliate';
