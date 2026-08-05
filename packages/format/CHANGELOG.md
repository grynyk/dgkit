# @dgkit/format

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
