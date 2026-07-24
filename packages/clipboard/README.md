# @dgkit/clipboard

[![npm](https://img.shields.io/npm/v/@dgkit/clipboard)](https://www.npmjs.com/package/@dgkit/clipboard)

An **SSR-safe** Angular clipboard helper with **signal-based operation state**.
The command stays a plain async method; only the state you render is reactive.

- ✅ `status()` — `idle` → `copying` → `copied` / `failed`, as a signal
- ✅ Automatic status reset (configurable), cleared on destroy
- ✅ Graceful `execCommand` fallback for insecure contexts / older browsers
- ✅ SSR-safe — no browser globals touched on the server
- ✅ Zoneless-friendly — state changes are signal writes, no `NgZone`

## Installation

```bash
yarn add @dgkit/clipboard
```

## Compatibility

Works with **Angular 18, 19, 20 and 21**.

| Peer dependency   | Supported range      |
| ----------------- | -------------------- |
| `@angular/core`   | `>=18.0.0 <22.0.0`   |
| `@angular/common` | `>=18.0.0 <22.0.0`   |
| `rxjs`            | `^6.5.3` or `^7.4.0` |

Angular and RxJS are **peer dependencies** — never bundled into the package.

## Quick start

```ts
import { Component } from '@angular/core';
import { injectClipboard } from '@dgkit/clipboard';

@Component({
  standalone: true,
  template: `
    <button
      (click)="clipboard.copy('value')"
      [disabled]="!clipboard.isSupported()"
    >
      @switch (clipboard.status()) {
        @case ('copied') {
          Copied!
        }
        @case ('failed') {
          Failed
        }
        @case ('copying') {
          Copying…
        }
        @default {
          Copy
        }
      }
    </button>
  `,
})
export class CopyButton {
  protected readonly clipboard = injectClipboard();
}
```

## API

```ts
const clipboard = injectClipboard(options?);

await clipboard.copy('value'); // Promise<boolean>

clipboard.status();      // Signal<'idle' | 'copying' | 'copied' | 'failed'>
clipboard.error();       // Signal<unknown>          — last failure cause
clipboard.copied();      // Signal<string | undefined> — last copied value
clipboard.isSupported(); // Signal<boolean>
clipboard.reset();       // back to 'idle' immediately
```

### Options

| Option       | Type      | Default | Description                                                             |
| ------------ | --------- | ------- | ----------------------------------------------------------------------- |
| `resetAfter` | `number`  | `2000`  | ms before `copied`/`failed` reverts to `idle`. `0` disables auto-reset. |
| `fallback`   | `boolean` | `true`  | Allow the legacy `document.execCommand('copy')` path.                   |

`copy()` resolves `true` on success and `false` on failure — it never rejects,
so you can safely call it from a template without an unhandled rejection.

## Behavior details

### Strategy

1. `navigator.clipboard.writeText()` when available (secure contexts).
2. Otherwise, if `fallback` is enabled, a temporary off-screen `<textarea>` plus
   `document.execCommand('copy')`. The element is always removed, even if the
   command throws.
3. If neither is possible, `isSupported()` is `false` and `copy()` resolves
   `false` with an `Error` in `error()`.

### Teardown

A pending reset timer is cleared when the injection context is destroyed, and a
copy still in flight will **not** write state into a destroyed host — so no
`ExpressionChanged` surprises and no leaked timers.

### SSR

On the server nothing is touched: `isSupported()` is `false` and `copy()`
resolves `false`. No consumer guards required.

## License

[MIT](../../LICENSE)
