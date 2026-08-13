# @dgkit/betting-math

## 0.4.0

### Minor Changes

- 4446e94: Add parlay (accumulator) expected value and Kelly staking:
  `combineParlayLegs` collapses a multi-leg bet to a single equivalent
  probability and price, and `calculateParlayExpectedValue`/
  `calculateParlayKellyStake` delegate straight to the single-bet
  `calculateExpectedValue`/`calculateKellyStake` on that combined price —
  assuming independence between legs, which callers can override by
  supplying a correlation-adjusted probability per leg.
- de2fc02: Add expected value and Kelly criterion staking (`calculateEdge`,
  `calculateExpectedValue`, `calculateKellyStake`, with fractional-Kelly
  support), hedging/green-up calculators (`calculateHedgeStake` for a plain
  back-to-back hedge, `calculateExchangeLayStake` for a commission-aware
  betting-exchange lay), and matched-betting free-bet extraction
  (`calculateFreeBetLayStake`) — all built on the existing exact-`Fraction`
  odds/probability primitives, with property-tested profit-equalization
  invariants.

### Patch Changes

- 7b6e8c7: Add bookmaker promo mechanics: `applyProfitBoost` (boosted winnings, with
  an optional cap), `calculateRiskFreeBetLayStake` (a cash qualifying bet
  refunded as free-bet credit if it loses, which reduces exactly to
  `calculateExchangeLayStake` at `refundCap = 0`), and
  `calculateAccaInsuranceExpectedValue` (expected value of an accumulator
  insured against a limited number of losing legs, via `generateCombinations`
  over the possible losers).
- 5763796: Fix `calculateRiskFreeBetLayStake` silently returning a negative lay
  stake/liability when the refund market's odds make the refund's cash
  value exceed `backStake × backOdds`; it now throws instead. Also validate
  `refundBackOdds`/`refundLayOdds`/`refundCommission` unconditionally
  rather than only when `refundCap` is positive, validate
  `calculateAccaInsuranceExpectedValue`'s `refundValue` as non-negative,
  and replace its per-loss-count probability calculation (previously
  exponential in `legs.length`) with a linear-time Poisson-binomial
  recurrence.

## 0.3.0

### Minor Changes

- 79f3572: Add arbitrage (surebet) detection and stake-splitting: `detectArbitrage`
  and `calculateArbitrageStakes` split a stake across a market's best odds so
  every outcome returns exactly the same guaranteed amount, built on the same
  implied-probability math as `market.ts`.

## 0.2.0

### Minor Changes

- afb7792: Add CPA, RevShare, and hybrid commission calculators for iGaming affiliate
  programs, plus negative-carryover balance tracking (uncapped, capped, or
  no-carryover) across settlement periods.
- afb7792: Add market analysis: `impliedProbability`, `calculateOverround` (bookmaker
  margin/vig/hold), and `calculateFairOdds`/`calculateFairProbabilities`
  (proportional de-vig) for a full market of outcomes.

### Patch Changes

- da427e3: Patch release for the refreshed build/test toolchain (nx, eslint, vite,
  ng-packagr, jsdom, @analogjs/\*, @types/node) — no runtime behavior changes.

Managed by [Changesets](https://github.com/changesets/changesets).
