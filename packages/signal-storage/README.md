# @dgkit/signal-storage

[![npm](https://img.shields.io/npm/v/@dgkit/signal-storage)](https://www.npmjs.com/package/@dgkit/signal-storage)

**Type-safe, bidirectional synchronization between an Angular signal and
`localStorage`/`sessionStorage`.**

```ts
const theme = injectStorageSignal('theme', 'light');

theme(); // 'light' — or whatever was already in storage
theme.set('dark'); // updates the signal and persists
theme.update((t) => (t === 'light' ? 'dark' : 'light'));
theme.remove(); // clear storage, revert to the default
```

- ✅ **Reads on init** — seeded from any value already in storage
- ✅ **Persists on write** — `set()`/`update()` write through automatically
- ✅ **Cross-tab sync** — another tab changing the same key updates this
  signal too, via the native `storage` event (no echo loop: same-tab writes
  never trigger that event)
- ✅ **SSR-safe** — behaves as in-memory-only state on the server; `set()`
  never throws, `isSupported()` reports `false`
- ✅ **Never throws** — quota errors, private-browsing restrictions and
  corrupted stored JSON all degrade to a dev-mode warning, never a crash
- ✅ **Debounced writes** — coalesce rapid updates into one storage write;
  a pending write is always flushed on destroy, never silently dropped
- ✅ **Pluggable serialization** — swap `JSON` for a custom codec (`Date`,
  `Map`, anything)
- ✅ Zoneless-friendly — no `NgZone`, no `ChangeDetectorRef` assumptions

## Installation

```bash
yarn add @dgkit/signal-storage
```

## Compatibility

Works with **Angular 18, 19, 20 and 21**.

| Dependency | Supported range      |
| ---------- | -------------------- |
| Angular    | `>=18.0.0 <22.0.0`   |
| RxJS       | `^6.5.3` or `^7.4.0` |
| TypeScript | `>=5.4`              |

Angular and RxJS are **peer dependencies** — they are never bundled into the
package.

## Quick start

```ts
import { Component } from '@angular/core';
import { injectStorageSignal } from '@dgkit/signal-storage';

@Component({
  standalone: true,
  template: `
    <button (click)="theme.set(theme() === 'light' ? 'dark' : 'light')">
      Theme: {{ theme() }}
    </button>
  `,
})
export class ExampleComponent {
  // Field initializers run in an injection context, so this is all you need.
  protected readonly theme = injectStorageSignal('theme', 'light');
}
```

## API

```ts
const value = injectStorageSignal(key, defaultValue, options?);

value();                 // Signal read — T
value.set(next);         // write — updates the signal and persists
value.update(updater);   // derive a new value from the current one
value.remove();          // clear the key, revert to defaultValue
value.isSupported();     // Signal<boolean> — false during SSR / when storage is unreachable
```

### Options

| Option       | Type                      | Default     | Description                                                                                  |
| ------------ | ------------------------- | ----------- | -------------------------------------------------------------------------------------------- |
| `storage`    | `'local' \| 'session'`    | `'local'`   | Which `Storage` object to use.                                                               |
| `serializer` | `{ parse, stringify }`    | `JSON`      | Custom (de)serialization for values `JSON` can't round-trip.                                 |
| `syncTabs`   | `boolean`                 | `true`      | Listen for the same key changing in another tab/window via the `storage` event.              |
| `debounce`   | `number`                  | `0`         | Debounce writes, in ms. `0` writes synchronously. A pending write is flushed on destroy.     |
| `equal`      | `(a: T, b: T) => boolean` | `Object.is` | Equality used to skip redundant signal updates, both for local writes and cross-tab updates. |

### Custom serializer example

```ts
const lastVisit = injectStorageSignal('lastVisit', new Date(0), {
  serializer: {
    parse: (raw) => new Date(raw),
    stringify: (value) => value.toISOString(),
  },
});
```

## Behavior details

### Cross-tab sync

By default, changes to the same key made in another tab or window are
reflected here automatically. This relies on the native `storage` event,
which the browser only fires in _other_ tabs — the tab that made the change
never receives it, so there's no risk of an update loop. Set
`syncTabs: false` to opt out.

### Errors never throw

- **Corrupted stored JSON** (or a custom serializer that throws) on read: the
  signal falls back to `defaultValue` and logs a dev-mode warning.
- **Write failures** (quota exceeded, Safari private-browsing restrictions):
  the signal still updates in memory; the write is dropped with a dev-mode
  warning instead of crashing the app.
- **Storage unreachable at all** (SSR, or accessing `localStorage` throws):
  `isSupported()` is `false` and the signal behaves as ordinary in-memory
  state — `set()`/`update()`/`remove()` all still work, they just don't
  persist.

### Debounce

- `debounce: 0` (default): every `set()`/`update()` writes to storage
  synchronously.
- `debounce > 0`: writes within the window are coalesced — only the latest
  value is written, once. A write still pending at teardown is flushed
  immediately rather than lost.

## Development

This package lives in the [`dgkit`](../../README.md) Nx monorepo.

```bash
yarn nx build signal-storage        # ng-packagr production build
yarn nx test signal-storage         # Vitest + coverage
yarn nx lint signal-storage         # ESLint
yarn nx typecheck signal-storage    # tsc --noEmit
```

## Testing

Run with `yarn nx test signal-storage`. The suite covers initial reads,
writes, debounce, cross-tab sync (via dispatched `StorageEvent`s), custom
serializers, and degraded/SSR environments. Coverage thresholds are enforced.

## Contributing

Contributions are welcome — see the repository
[CONTRIBUTING guide](../../CONTRIBUTING.md).

## License

[MIT](../../LICENSE)
