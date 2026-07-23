# Contributing to dgkit

Thanks for your interest in improving **dgkit**! This guide covers the local
workflow, conventions and the release process.

## Prerequisites

- **Node.js** `^20.19 || ^22.12 || ^24` — run `nvm use` to match [`.nvmrc`](./.nvmrc) (`24.13.0`).
- **pnpm** `>=10` — `corepack enable` or `npm i -g pnpm@10`.

```bash
git clone <your-fork-url> dgkit
cd dgkit
nvm use
pnpm install
```

## Everyday commands

```bash
pnpm build            # build all packages
pnpm test             # Vitest + coverage (all packages)
pnpm lint             # ESLint (type-aware)
pnpm typecheck        # tsc --noEmit
pnpm format           # Prettier --write
pnpm verify           # everything CI runs, locally
```

Scope any target to one project with Nx, e.g. `pnpm nx test resize-observer`.
Nx caches results and `pnpm nx affected -t build test lint` only runs what your
changes touched.

## Project conventions

- **Standalone + signals only.** No `NgModule`s, no deprecated APIs.
- **Strict everything** — strict TypeScript, strict Angular templates, type-aware
  ESLint. Fix issues; do not leave `TODO`s or disable rules without a reason.
- **SSR-safe** — never touch browser globals in field initializers; guard with
  `isPlatformBrowser` and feature detection.
- **Every package is tested with Vitest** (Angular packages via the Analog
  plugin; framework-free packages run plain). See `resize-observer` for the
  signal-API + directive pattern.
- **Coverage thresholds**: statements 95%, branches 90%, functions 95%, lines 95%.

## Adding a package

```bash
pnpm new:package <name> "<one-line description>"        # Angular package
pnpm new:package <name> "<description>" --pure          # no Angular peers
```

Then implement it, document it in its `README.md`, and add it to the table in the
root [README](./README.md).

## Commits

We use [Conventional Commits](https://www.conventionalcommits.org/):

```text
feat(resize-observer): add device-pixel-content-box support
fix(resize-observer): normalize NaN debounce to zero
docs: clarify initial emission semantics
test(resize-observer): cover teardown edge cases
ci: run vitest coverage on pull requests
chore: bump nx to 23.1.0
```

## Changesets & releasing

Every PR that changes a published package **must** include a changeset:

```bash
pnpm changeset
```

Choose the package(s) and bump (patch/minor/major) and write a short summary.
Maintainers release by merging the automated “Version Packages” PR (created by the
release workflow), which runs `changeset version` and then `changeset publish`
with npm provenance.

## Pull requests

1. Branch off `main`.
2. Keep changes focused; add/adjust tests.
3. Run `pnpm verify` locally.
4. Include a changeset when applicable.
5. Open the PR — CI must be green before review.

By contributing you agree your work is licensed under the [MIT License](./LICENSE).
