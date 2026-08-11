---
'@dgkit/betting-math': minor
---

Add expected value and Kelly criterion staking (`calculateEdge`,
`calculateExpectedValue`, `calculateKellyStake`, with fractional-Kelly
support), hedging/green-up calculators (`calculateHedgeStake` for a plain
back-to-back hedge, `calculateExchangeLayStake` for a commission-aware
betting-exchange lay), and matched-betting free-bet extraction
(`calculateFreeBetLayStake`) — all built on the existing exact-`Fraction`
odds/probability primitives, with property-tested profit-equalization
invariants.
