---
'@dgkit/betting-math': patch
---

Fix `calculateRiskFreeBetLayStake` silently returning a negative lay
stake/liability when the refund market's odds make the refund's cash
value exceed `backStake × backOdds`; it now throws instead. Also validate
`refundBackOdds`/`refundLayOdds`/`refundCommission` unconditionally
rather than only when `refundCap` is positive, validate
`calculateAccaInsuranceExpectedValue`'s `refundValue` as non-negative,
and replace its per-loss-count probability calculation (previously
exponential in `legs.length`) with a linear-time Poisson-binomial
recurrence.
