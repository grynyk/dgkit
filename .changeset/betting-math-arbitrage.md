---
'@dgkit/betting-math': minor
---

Add arbitrage (surebet) detection and stake-splitting: `detectArbitrage`
and `calculateArbitrageStakes` split a stake across a market's best odds so
every outcome returns exactly the same guaranteed amount, built on the same
implied-probability math as `market.ts`.
