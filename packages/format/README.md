# @dgkit/format

Framework-free, **grapheme-safe** string and number formatting helpers. No
Angular, no dependencies — just correct little functions you would otherwise
re-implement (subtly wrong) in every project.

- ✅ Zero dependencies, zero framework — usable anywhere
- ✅ Grapheme-safe via `Intl.Segmenter` — never splits emoji, flags or accents
- ✅ Defensively clamped inputs — negative, `NaN` and `Infinity` are handled
- ✅ Fully typed, tree-shakeable

## Installation

```bash
yarn add @dgkit/format
```

## Compatibility

> **Framework-agnostic.** `@dgkit/format` has **no Angular — or any framework — dependency**. It is pure TypeScript with zero runtime dependencies, so it works with **any Angular version** (or React, Vue, Svelte, plain Node, a Web Worker… anywhere JavaScript runs).

## `middleTruncate`

Truncate the middle of a string, keeping the start and end — ideal for hashes,
wallet addresses and long IDs.

```ts
import { middleTruncate } from '@dgkit/format';

middleTruncate('0x71C7656EC7ab88b098defB751B7401B5f6d8976F', 6, 4);
// '0x71C7…976F'

middleTruncate('hello', 5, 5); // 'hello'  (too short to shorten)
middleTruncate('abcdefghij', 5, 0); // 'abcde…'  (tail 0 is respected)
```

`middleTruncate(value, head = 5, tail = 5, ellipsis = '…')`

- `head` / `tail` are clamped to non-negative integers.
- The result is **never longer than the input** — if truncating wouldn't save
  at least the ellipsis's length, the original is returned.
- `tail = 0` keeps only the start (a naive `slice(-0)` implementation returns
  the whole string — this one doesn't).
- `null` / `undefined` → `''`.

## `truncate`

Truncate the end of a string to at most `max` graphemes (ellipsis included).

```ts
import { truncate } from '@dgkit/format';

truncate('The quick brown fox', 9); // 'The quic…'
```

`truncate(value, max = 20, ellipsis = '…')` — the result never exceeds `max`
graphemes; `max` is clamped to a non-negative integer.

## `fileSize`

Format a byte count for humans.

```ts
import { fileSize } from '@dgkit/format';

fileSize(0); // '0 B'
fileSize(1536); // '1.5 KiB'
fileSize(1_500_000, { standard: 'decimal' }); // '1.5 MB'
```

`fileSize(bytes, options?)` — `standard: 'binary' | 'decimal'` (default
`'binary'`), `maximumFractionDigits` (default `1`), `separator` (default `' '`).

## Grapheme safety

Truncation uses `Intl.Segmenter` (available in all current browsers and Node
16+) so a family emoji `👨‍👩‍👧‍👦`, a flag `🇺🇦`, or an accented `é` counts as a
single character and is never cut in half into lone surrogates. Where
`Intl.Segmenter` is unavailable, it falls back to code-point splitting.

## License

[MIT](../../LICENSE)
