# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`dgkit` is an Nx + Yarn monorepo of small, independently publishable `@dgkit/*`
packages — a mix of Angular (standalone + signals) libraries and
framework-free TypeScript utilities. Each package under `packages/` is built,
tested, versioned and published independently. `apps/playground` is a demo app
(not published) that exercises every package and deploys to GitHub Pages.

## Commands

```bash
nvm use            # Node from .nvmrc (24.13.0)
corepack enable    # provisions Yarn 4 (Berry) from packageManager
yarn install
```

```bash
yarn build                 # nx run-many -t build (all packages)
yarn test                  # Vitest + coverage (all packages)
yarn lint                  # ESLint, type-aware
yarn typecheck              # tsc --noEmit
yarn format                # Prettier --write
yarn format:check          # Prettier --check
yarn playground             # nx serve playground
yarn verify                 # format:check + lint + typecheck + test + build — run before considering work done
```

Scope to a single package with Nx (much faster than the repo-wide scripts):

```bash
yarn nx build resize-observer
yarn nx test resize-observer
yarn nx test resize-observer --coverage=false   # skip coverage for a quick loop
yarn nx lint resize-observer
yarn nx typecheck resize-observer
```

Run a single spec file directly with Vitest from a package directory:

```bash
cd packages/resize-observer
yarn vitest run src/lib/resize-observer.signal.spec.ts
```

Only run what changed:

```bash
yarn nx affected -t build test lint typecheck
```

Scaffold a new package (mirrors the `resize-observer` template — its own
`package.json`, `project.json`, `ng-package.json`, tsconfigs, Vitest config,
README, CHANGELOG, wired into the workspace):

```bash
yarn new:package media-query "Angular media-query utilities."
yarn new:package slugify "String slug helpers." --pure   # no Angular peer deps
```

See [tools/create-package.mjs](tools/create-package.mjs) for exactly what gets generated.

## Architecture

### Two package flavors

- **Angular packages** (`resize-observer`, `intersection-observer`,
  `mutation-observer`, `signal-storage`, `signal-history`, `route-state`,
  `clipboard`, `combobox`) depend on `@angular/core`/`@angular/common`/`rxjs`
  as **peer** dependencies (never bundled) and are built with `ng-packagr`.
- **Pure packages** (`format`, `blob-saver`, `betting-math`) have zero
  framework dependency, are plain TypeScript, and work anywhere JS runs.
  `betting-math` is exact-rational (fraction-based) sports-betting math with
  no floating-point rounding.

`yarn new:package ... --pure` scaffolds the second flavor; omit the flag for
the first.

### Package anatomy

Every package under `packages/<name>/` follows the same shape:

- `src/index.ts` — the only public entry point; everything exported here is
  the package's public API. `src/lib/` holds implementation, split into small
  single-purpose files (e.g. `*.core.ts` engine, `*.types.ts`, `*.utils.ts`,
  a signal-API file, a directive file), each with a co-located `*.spec.ts`.
- `project.json` — Nx target definitions (`build`/`test`/`lint`/`typecheck`),
  each with cache-relevant `outputs` declared.
- `ng-package.json` — ng-packagr config (Angular packages only); `dest` points
  at `dist/packages/<name>`, and only `README.md`/`CHANGELOG.md` ship as assets.
- `tsconfig.json` / `tsconfig.lib.json` / `tsconfig.spec.json` — all extend the
  root [tsconfig.base.json](tsconfig.base.json). The base config's `paths` map
  every `@dgkit/<name>` import straight to that package's `src/index.ts`, so
  other packages and the playground consume source directly, never `dist/`.
- `vitest.config.ts` — Vitest via the Analog Angular plugin, coverage
  thresholds enforced per package: **statements 95%, branches 90%, functions
  95%, lines 95%**.

### The signal-API + directive pattern

`resize-observer` is the canonical example (mirrored by
`intersection-observer` and `mutation-observer`): a single SSR-safe
"observation engine" function (`createResizeObservation` in
[resize-observer.core.ts](packages/resize-observer/src/lib/resize-observer.core.ts))
is shared by two thin consumers — a signal function (`injectResizeObserver`)
and a standalone `Directive`. The engine:

- Checks `isPlatformBrowser(inject(PLATFORM_ID))` and does nothing on the
  server — no browser global is ever touched during SSR.
- Feature-detects the native API and exposes `supported` rather than throwing.
- Reads reactive config (target, options) inside an Angular `effect`, so
  changing an input transparently re-observes.
- Writes results straight into a signal from the native callback — no
  `NgZone`, no `ChangeDetectorRef`, and no assumption zone.js is loaded
  (zoneless-friendly).
- Cleans up via `DestroyRef.onDestroy` (disconnect/unsubscribe), not manual
  lifecycle hooks.

When adding a similar observer/signal package, follow this split (engine +
signal wrapper + directive wrapper) rather than duplicating logic across the
two consumers.

### Testing

- Angular packages use Vitest with the Analog plugin; `src/test-setup.ts`
  initializes `BrowserTestingModule` with `provideZoneChangeDetection()` and
  patches globals — specs still import their own primitives from `'vitest'`.
- Pure packages run plain Vitest, no Angular test bed.
- Coverage `include`/`exclude` patterns in `vitest.config.ts` exclude
  `*.spec.ts`, `*.types.ts`, and `testing/` helper dirs from coverage
  accounting — put shared test mocks under `src/lib/testing/`.
- Property-based tests use `fast-check` where relevant (see `betting-math`).

### Linting

Flat ESLint config ([eslint.config.mjs](eslint.config.mjs)), type-aware,
`typescript-eslint` `recommendedTypeChecked` + `stylisticTypeChecked` +
Angular ESLint. Notable enforced rules: no non-null assertions
(`@typescript-eslint/no-non-null-assertion`), explicit function return types,
consistent type-only imports, and Angular selector prefix `dg`
(`dgResizeObserver`, `<dg-*>`). These relax for `*.spec.ts`/`testing/`/
`test-setup.ts` files (unsafe-* and explicit-return-type rules are off there).
`lint` runs with `--max-warnings 0` — warnings fail CI.

### Releasing

Per-package independent versioning via [Changesets](https://github.com/changesets/changesets):
every PR touching a published package needs `yarn changeset`. CI's release
workflow runs `changeset version` (opening a "Version Packages" PR) and, once
merged, `changeset publish` with npm provenance.
[tools/publish-dist.mjs](tools/publish-dist.mjs) publishes the **built**
`dist/packages/<name>` directories directly, not the source packages — CI's
build job additionally runs `npm pack --dry-run` per package and fails if any
`*.spec.*`, `test-setup`, or `testing/` file leaks into the packed output.

### CI (`.github/workflows/ci.yml`)

Three parallel jobs: `lint` (Prettier check + `nx affected -t lint typecheck`),
`test` (`nx affected -t test`), `build` (full `nx run-many -t build` +
`npm pack --dry-run` validation). Affected-based jobs rely on `nx-set-shas`
against `main` as the default base ([nx.json](nx.json): `defaultBase: "main"`).
