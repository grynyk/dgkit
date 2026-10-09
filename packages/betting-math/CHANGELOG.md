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
- c5763af: Ship CommonJS alongside ESM. These framework-free packages were built with
  `ng-packagr`, which only emits the Angular Package Format — ESM-only, with no
  `main` and no `require` condition in `exports`. Node 22.12+ papered over that
  through `require(esm)`, so the packages appeared to work while failing outright
  on Node 18 and 20, under CommonJS Jest, and in older bundlers.

  They are now built with tsup into both formats, with per-format type
  declarations and a full conditional `exports` map. Type resolution is verified
  under `node16`, `nodenext`, `bundler` and legacy `node10`, and CI packs each
  tarball and both `require()`s and `import`s it across Node 18/20/22/24.

  Also: `tslib` is no longer declared as a dependency — it was never referenced
  in the built output, so "zero runtime dependencies" is now true of the manifest
  and not just the code. npm keywords no longer claim `angular`/`standalone`/`ssr`
  on packages that have no framework dependency, and `@dgkit/betting-math`'s
  description now covers the market, staking, hedging, promo and affiliate modules
  added since it was written.

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
