# @dgkit/format

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
