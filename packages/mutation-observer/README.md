# @dgkit/mutation-observer

[![npm](https://img.shields.io/npm/v/@dgkit/mutation-observer)](https://www.npmjs.com/package/@dgkit/mutation-observer)

A lightweight, **standalone** and **SSR-safe** Angular wrapper around the native
[`MutationObserver`](https://developer.mozilla.org/docs/Web/API/MutationObserver)
API. Ships **two APIs over one engine** — a signal function and a directive —
tree-shakeable, with zero runtime dependencies beyond `tslib`.

- ✅ `injectMutationObserver()` — DOM mutations as a **signal** (`records()`, `event()`)
- ✅ `[dgMutationObserver]` — standalone directive with a typed `(dgMutation)` output
- ✅ SSR-safe — never touches `MutationObserver` on the server, no consumer guards
- ✅ Zoneless-friendly — the native callback writes a signal; **no `NgZone`, no
  `ChangeDetectorRef`, no assumption that zone.js is loaded**
- ✅ Optional debounce that **accumulates** every record observed in the window
  into one event, instead of just keeping the latest
- ✅ Defends against the native `observe()` throw: an init with no
  `childList`/`attributes`/`characterData` flag set is normalized to
  `{ childList: true }` instead of crashing
- ✅ Reactive config — pass signals for `init`/`debounce`; changes re-observe
- ✅ Robust teardown via `disconnect()` — no leaks

---

## Installation

```bash
yarn add @dgkit/mutation-observer
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

## Quick start — signal API (recommended)

```ts
import { Component, ElementRef, viewChild } from '@angular/core';
import { injectMutationObserver } from '@dgkit/mutation-observer';

@Component({
  standalone: true,
  template: `<ul #list>
    <li *ngFor="let item of items">{{ item }}</li>
  </ul>`,
})
export class ExampleComponent {
  private readonly list = viewChild.required<ElementRef<HTMLElement>>('list');

  // Field initializers run in an injection context, so this is all you need.
  protected readonly mutations = injectMutationObserver(this.list, {
    init: { childList: true, subtree: true },
  });
}
```

`injectMutationObserver` accepts a raw `Node`, an `ElementRef`, or an
accessor/signal returning either (so `viewChild()` is passed straight through).
Options may be plain values or signals; passing a signal makes them reactive.

## Quick start — directive

A common use case: wait for an element that isn't there yet (a third-party
widget, a lazily-rendered row) to appear, then act on it once.

```ts
import { Component } from '@angular/core';
import {
  DgMutationEvent,
  MutationObserverDirective,
} from '@dgkit/mutation-observer';

@Component({
  standalone: true,
  imports: [MutationObserverDirective],
  template: `
    <div
      dgMutationObserver
      [mutationSubtree]="true"
      (dgMutation)="onMutation($event)"
    >
      <!-- content that gets populated later -->
    </div>
  `,
})
export class ExampleComponent {
  onMutation(event: DgMutationEvent): void {
    console.log(event.records.length, 'mutation(s) observed');
  }
}
```

## Which API?

| Use…                       | When…                                                                 |
| -------------------------- | --------------------------------------------------------------------- |
| `injectMutationObserver()` | you want the latest mutation batch as **state** (signals).            |
| `[dgMutationObserver]`     | you want to **react to mutation events** declaratively in a template. |

Both share the same engine and options.

### Signal API reference

```ts
const mutations = injectMutationObserver(target, options?);
mutations.records();      // Signal<readonly MutationRecord[] | undefined>
mutations.event();        // Signal<DgMutationEvent | undefined>
mutations.isSupported();  // Signal<boolean>  — false during SSR / when unsupported
```

Options: `init` (a `MutationObserverInit`, defaults to `{ childList: true }`) and
`debounce` — each a value **or** a signal/accessor.

## API

### Selector

`[dgMutationObserver]` — apply as an attribute on any element.

### Inputs

| Input                           | Type                | Default | Description                                                         |
| ------------------------------- | ------------------- | ------- | ------------------------------------------------------------------- |
| `mutationChildList`             | `boolean`           | `true`  | Notify when child nodes are added or removed.                       |
| `mutationSubtree`               | `boolean`           | `false` | Extend observation to descendants, not just direct children.        |
| `mutationAttributes`            | `boolean`           | `false` | Notify on attribute changes.                                        |
| `mutationAttributeFilter`       | `readonly string[]` | —       | Restrict attribute observation to these names.                      |
| `mutationAttributeOldValue`     | `boolean`           | `false` | Record the attribute's previous value on each mutation.             |
| `mutationCharacterData`         | `boolean`           | `false` | Notify on text node changes.                                        |
| `mutationCharacterDataOldValue` | `boolean`           | `false` | Record the text node's previous value on each mutation.             |
| `mutationDebounce`              | `number`            | `0`     | Debounce in milliseconds. Negative / `NaN` / non-finite become `0`. |

If every one of `mutationChildList`/`mutationAttributes`/`mutationCharacterData`
is `false`, the request is normalized to `{ childList: true }` — the native
`observe()` throws otherwise, and this package would rather stay useful than
crash on a template typo.

### Outputs

| Output       | Payload           | Description                                            |
| ------------ | ----------------- | ------------------------------------------------------ |
| `dgMutation` | `DgMutationEvent` | Fires with every mutation batch (subject to debounce). |

### Event type

```ts
export interface DgMutationEvent {
  /** Every mutation record observed since the previous emission. */
  readonly records: readonly MutationRecord[];
  /** The node the observation was attached to. */
  readonly target: Node;
}
```

## Behavior details

### Debounce and record accumulation

- `mutationDebounce = 0` (default): each native callback batch emits
  **synchronously** as its own event.
- `mutationDebounce > 0`: every record observed within the window is
  **concatenated** into a single event, rather than only keeping the latest
  batch — useful for "wait until the DOM settles" instead of reacting to every
  intermediate mutation.
- The value is read per emission, so changing it at runtime takes effect
  immediately.

### SSR

The directive is safe to import and use during server-side rendering. It:

- guards on `isPlatformBrowser`, so nothing runs on the server;
- feature-detects `MutationObserver` and stays inert (with a dev-mode warning)
  if it is missing.

No consumer-side guards are required.

## Development

This package lives in the [`dgkit`](../../README.md) Nx monorepo.

```bash
yarn nx build mutation-observer        # ng-packagr production build
yarn nx test mutation-observer         # Vitest + coverage
yarn nx lint mutation-observer         # ESLint
yarn nx typecheck mutation-observer    # tsc --noEmit
```

## Testing

Run with `yarn nx test mutation-observer`. The suite covers the directive, the
signal API and the utilities separately, backed by a `MutationObserver` mock
that can simulate multiple record batches and an environment where the API is
missing entirely. Coverage thresholds are enforced.

## Contributing

Contributions are welcome — see the repository
[CONTRIBUTING guide](../../CONTRIBUTING.md).

## License

[MIT](../../LICENSE)
