# @dgkit/betting-math

[![npm](https://img.shields.io/npm/v/@dgkit/betting-math)](https://www.npmjs.com/package/@dgkit/betting-math)

Pure, exact-rational sports-betting math: odds format conversion, system bet
combinatorics, dead heat reduction, Rule 4 deductions, void-leg collapse,
each-way settlement, Asian handicap quarter-line splitting, and cash-out
estimates.

- ✅ **Exact rational arithmetic** — every calculation happens in an internal
  `Fraction` (`bigint` ratio) type, never floating point, so a chain of
  dead-heat/Rule-4/system-bet multiplications never drifts off the true
  answer by a cent
- ✅ **No embedded data** — this package is pure computation, not
  configuration. It ships no default Rule 4 deduction table and no
  "Trixie"/"Yankee" constants; you always supply your own numbers, and the
  library just gets the math right
- ✅ **Zero runtime dependencies**, framework-free — works anywhere
  JavaScript runs
- ✅ **Property-tested** (via [fast-check](https://fast-check.dev)) —
  algebraic laws (commutativity, round-trips, monotonicity) are checked
  against generated inputs, not just hand-picked examples

## Installation

```bash
yarn add @dgkit/betting-math
```

## Compatibility

> **Framework-agnostic.** `@dgkit/betting-math` has **no Angular — or any
> framework — dependency**. It is pure TypeScript with zero runtime
> dependencies, so it works with **any Angular version** (or React, Vue,
> plain Node… anywhere JavaScript runs).

## Quick start

### Odds conversion

```ts
import { parseOdds, formatOdds } from '@dgkit/betting-math';

const decimal = parseOdds('5/2', 'fractional'); // canonical Fraction, decimal 3.5
formatOdds(decimal, 'american'); // 150
formatOdds(decimal, 'hongkong'); // 2.5
formatOdds(decimal, 'malay'); // -0.4
```

Supported formats: `decimal`, `fractional`, `american`, `hongkong`, `malay`,
`indonesian`. Every conversion goes through canonical decimal odds (a
`Fraction > 1`), so any format converts to any other. See `odds.ts`'s JSDoc
for each format's valid domain — invalid input throws rather than silently
producing a plausible-looking wrong price.

### System bet settlement

```ts
import { fraction, settleSystemBet, type Leg } from '@dgkit/betting-math';

const legs: Leg[] = [
  { odds: parseOdds(3, 'decimal'), status: 'win' },
  { odds: parseOdds(4, 'decimal'), status: 'lose' },
  { odds: parseOdds(2, 'decimal'), status: 'win' },
];

// A Trixie: 3 doubles + 1 treble.
const result = settleSystemBet([2, 3], legs, fraction(1, 1));

result.totalReturned; // Fraction
result.profit; // Fraction
result.lines; // every line settled, including voided ones, for auditability
```

### Recipes: common system-bet names

This package ships no named-system constants — every system bet is just a
`(legCount, folds)` pair passed to `settleSystemBet`/`getFullCoverLines`.
Here's what the common UK/Irish bookmaker names mean in those terms:

| Name     | Legs | `folds`                 | Lines |
| -------- | ---- | ----------------------- | ----- |
| Trixie   | 3    | `[2, 3]`                | 4     |
| Patent   | 3    | `[1, 2, 3]`             | 7     |
| Yankee   | 4    | `[2, 3, 4]`             | 11    |
| Lucky 15 | 4    | `[1, 2, 3, 4]`          | 15    |
| Lucky 31 | 5    | `[1, 2, 3, 4, 5]`       | 31    |
| Heinz    | 6    | `[2, 3, 4, 5, 6]`       | 57    |
| Lucky 63 | 6    | `[1, 2, 3, 4, 5, 6]`    | 63    |
| Goliath  | 8    | `[2, 3, 4, 5, 6, 7, 8]` | 247   |

## API overview

| Module              | Exports                                                                                                                           |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `fraction.ts`       | `Fraction`, `fraction`, arithmetic (`addFractions`, …), `fractionFromNumber`/`fractionToNumber`/`fractionToString`, `ZERO`, `ONE` |
| `odds.ts`           | `parseOdds`, `formatOdds`, `OddsFormat`                                                                                           |
| `combinations.ts`   | `generateCombinations` — generic `C(n, k)`                                                                                        |
| `system-bets.ts`    | `getFullCoverLines`, `countFullCoverLines` — no named presets, see Recipes above                                                  |
| `dead-heat.ts`      | `reduceDeadHeatOdds`                                                                                                              |
| `rule4.ts`          | `lookupRule4Deduction`, `applyRule4Deduction`, `Rule4Band` — **no default table**, see below                                      |
| `void-collapse.ts`  | `collapseVoidLegs`                                                                                                                |
| `each-way.ts`       | `derivePlaceOdds`                                                                                                                 |
| `asian-handicap.ts` | `splitQuarterLine`, `settleAsianHandicapLine`, `settleAsianHandicap`                                                              |
| `cash-out.ts`       | `estimateCashOutValue`, `estimateMultiLegCashOutValue` — **approximation**, see below                                             |
| `settlement.ts`     | `settleLine`, `settleSystemBet` — the orchestrator built on everything above                                                      |

## Rule 4 deductions — bring your own table

Rule 4 deduction bands (how much a winning bet is docked when another runner
in the race was withdrawn) are published per-bookmaker. They're all close to
a common industry scale, but not identical, so this package deliberately
ships **no default table** — `lookupRule4Deduction` always requires one:

```ts
import {
  lookupRule4Deduction,
  applyRule4Deduction,
  type Rule4Band,
} from '@dgkit/betting-math';

const table: Rule4Band[] = [
  { maxDecimalOdds: 2.0, deductionPence: 25 },
  { maxDecimalOdds: 4.0, deductionPence: 10 },
  // ...source this from your bookmaker's current published scale
];

const deduction = lookupRule4Deduction(withdrawnOdds, table);
const adjustedOdds = applyRule4Deduction(odds, deduction);
```

A `Leg` can also skip the lookup entirely and specify `{ kind: 'explicit',
deductionPence }` directly, if you already know the percentage.

## Cash-out — approximation, not a rule

Unlike everything else in this package, cash-out has no single correct
answer: real bookmakers apply a proprietary margin on top of fair value and
reserve full discretion over the price they'll actually offer.
`estimateCashOutValue`/`estimateMultiLegCashOutValue` compute the standard
fair-value estimate (present value at current market odds) with an explicit
`margin` you supply — treat the result as a reference figure, not a
guarantee.

## Behavior details

### Settlement order of operations

For each combination line, each part (win, and place if every leg in the
combination has each-way terms):

1. **Void-leg collapse** — legs void for that part are dropped; if all are
   void, the line is void (stake returned). Otherwise it settles at the
   lower surviving fold.
2. **Dead-heat reduction** — applied to each surviving leg's odds.
3. **Rule 4 deduction(s)** — applied after dead heat, in the order given, to
   whatever price dead heat left the leg at.
4. **Odds product and outcome** — surviving legs' effective odds are
   multiplied; the line wins only if every surviving leg's status is `'win'`.

### Precision

`Fraction` values only ever convert to a floating-point `number` at
`fractionToNumber` — a deliberate, single, final display-boundary step.
Everything upstream of that (odds conversion, dead heat, Rule 4, system-bet
products) stays exact. The one format that can represent _any_ rational
odds value exactly, round-trip, is `fractional` — every other format
(including `decimal` itself) is fundamentally a decimal-based real-world
notation.

## Development

This package lives in the [`dgkit`](../../README.md) Nx monorepo.

```bash
yarn nx build betting-math        # ng-packagr production build
yarn nx test betting-math         # Vitest + coverage
yarn nx lint betting-math         # ESLint
yarn nx typecheck betting-math    # tsc --noEmit
```

## Testing

Run with `yarn nx test betting-math`. Alongside hand-picked example cases
(including a fully hand-verified 15-line Lucky 15 settlement with two void
legs and a dead heat), the suite uses
[fast-check](https://fast-check.dev) to property-test the algebraic
foundations — `Fraction` arithmetic laws, odds format round-trips,
combination counts against `C(n, k)`, deduction monotonicity, and more.
Coverage thresholds are enforced.

## Contributing

Contributions are welcome — see the repository
[CONTRIBUTING guide](../../CONTRIBUTING.md).

## License

[MIT](../../LICENSE)
