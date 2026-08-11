---
'@dgkit/betting-math': minor
---

Add parlay (accumulator) expected value and Kelly staking:
`combineParlayLegs` collapses a multi-leg bet to a single equivalent
probability and price, and `calculateParlayExpectedValue`/
`calculateParlayKellyStake` delegate straight to the single-bet
`calculateExpectedValue`/`calculateKellyStake` on that combined price —
assuming independence between legs, which callers can override by
supplying a correlation-adjusted probability per leg.
