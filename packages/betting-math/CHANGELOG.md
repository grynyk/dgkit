# @dgkit/betting-math

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
