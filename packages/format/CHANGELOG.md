# @dgkit/format

## 0.3.0

### Minor Changes

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

- 5763796: Routine maintenance release, no functional changes.

## 0.2.1

### Patch Changes

- da427e3: Patch release for the refreshed build/test toolchain (nx, eslint, vite,
  ng-packagr, jsdom, @analogjs/\*, @types/node) — no runtime behavior changes.

## 0.2.0

### Minor Changes

- bd04c16: Add an optional `locale` to `fileSize` so the grouping and decimal separators
  are deterministic instead of depending on the host's default locale. The
  formatted number is produced via `toLocaleString(locale, …)`; omit `locale` to
  keep the previous host-default behaviour.

## 0.1.0

### Minor Changes

- b8fa8ca: Initial release: framework-free, grapheme-safe formatting helpers.

  - `middleTruncate(value, head, tail, ellipsis)` — keeps the start and end of a
    string (hashes, addresses, paths). Clamps `head`/`tail` to non-negative
    integers, so `tail = 0` no longer returns the entire string (the classic
    `slice(-0)` bug), and the result is never longer than the input.
  - `truncate(value, max, ellipsis)` — end truncation that never exceeds `max`.
  - `fileSize(bytes, options?)` — binary (KiB) or decimal (kB) human sizes.
  - Truncation uses `Intl.Segmenter`, so emoji ZWJ sequences (👨‍👩‍👧‍👦), flags (🇺🇦)
    and combining marks are never split into lone surrogates.

Managed by [Changesets](https://github.com/changesets/changesets).
