---
'@dgkit/betting-math': patch
---

Add bookmaker promo mechanics: `applyProfitBoost` (boosted winnings, with
an optional cap), `calculateRiskFreeBetLayStake` (a cash qualifying bet
refunded as free-bet credit if it loses, which reduces exactly to
`calculateExchangeLayStake` at `refundCap = 0`), and
`calculateAccaInsuranceExpectedValue` (expected value of an accumulator
insured against a limited number of losing legs, via `generateCombinations`
over the possible losers).
