# @dgkit/file-download

[![npm](https://img.shields.io/npm/v/@dgkit/file-download)](https://www.npmjs.com/package/@dgkit/file-download)

A tiny, **framework-free** helper for triggering a browser download from a
`Blob` — the "create an object URL, click a hidden `<a download>`, clean up"
dance every app ends up hand-rolling for CSV/Excel exports, generated PDFs,
file previews saved to disk, etc.

```ts
const csv = new Blob([content], { type: 'text/csv' });
downloadBlob('report.csv', csv);
```

- ✅ **No memory leaks** — revokes the object URL after the download starts,
  unlike the common hand-rolled version that never calls
  `URL.revokeObjectURL` at all
- ✅ **Framework-agnostic** — zero dependencies, works anywhere JavaScript
  runs in a browser (Angular, React, Vue, plain DOM)
- ✅ Cleans up its temporary `<a>` element even if `click()` throws
- ✅ `isDownloadSupported()` to guard the call in environments without a DOM

## Installation

```bash
yarn add @dgkit/file-download
```

## Compatibility

> **Framework-agnostic.** `@dgkit/file-download` has **no Angular — or any
> framework — dependency**. It is pure TypeScript with zero runtime
> dependencies, so it works with **any Angular version** (or React, Vue,
> plain Node… anywhere JavaScript runs).

## Usage

```ts
import { downloadBlob } from '@dgkit/file-download';

function exportReport(rows: Row[]): void {
  const csv = new Blob([toCsv(rows)], { type: 'text/csv' });
  downloadBlob('report.csv', csv);
}
```

Guard it in code that might run outside a browser (e.g. during SSR):

```ts
import { downloadBlob, isDownloadSupported } from '@dgkit/file-download';

if (isDownloadSupported()) {
  downloadBlob('report.csv', csv);
}
```

## API

### `downloadBlob(filename, blob)`

Triggers a browser download of `blob`, saved as `filename`.

Creates a temporary object URL and an off-screen `<a download>`, clicks it,
then removes the element and revokes the URL. The revoke is deferred to a
macrotask so the browser has already started the download by the time the URL
is released — calling `URL.revokeObjectURL` synchronously right after
`click()` is a common reason hand-rolled versions of this function
occasionally fail to download.

Throws if called where downloads aren't possible (see `isDownloadSupported`
below) — this is an imperative, user-triggered action with no meaningful
non-browser behavior.

### `isDownloadSupported()`

Returns whether triggering a download is possible in the current environment
— `false` under SSR/Node, or in any environment missing `document` or
`URL.createObjectURL`.

## Development

This package lives in the [`dgkit`](../../README.md) Nx monorepo.

```bash
yarn nx build file-download        # ng-packagr production build
yarn nx test file-download         # Vitest + coverage
yarn nx lint file-download         # ESLint
yarn nx typecheck file-download    # tsc --noEmit
```

## Contributing

Contributions are welcome — see the repository
[CONTRIBUTING guide](../../CONTRIBUTING.md).

## License

[MIT](../../LICENSE)
