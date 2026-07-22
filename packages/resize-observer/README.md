# @dgkit/resize-observer

A lightweight, **standalone** and **SSR-safe** Angular directive around the
native [`ResizeObserver`](https://developer.mozilla.org/docs/Web/API/ResizeObserver)
API. Built with modern Angular signals, tree-shakeable, and shipped with zero
runtime dependencies beyond `tslib`.

- ✅ Standalone directive — no `NgModule` required
- ✅ SSR-safe — never touches `ResizeObserver` on the server, no consumer guards
- ✅ Signal inputs — configuration is reactive at runtime
- ✅ Configurable debounce, observation box, initial emission and distinct mode
- ✅ Robust teardown via `disconnect()` — no leaks
- ✅ Fully typed, package-owned event contract

---

## Installation

```bash
npm install @dgkit/resize-observer
```

```bash
pnpm add @dgkit/resize-observer
```

```bash
yarn add @dgkit/resize-observer
```

## Compatibility

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
import { DgResizeEvent, ResizeObserverDirective } from '@dgkit/resize-observer';

@Component({
  standalone: true,
  imports: [ResizeObserverDirective],
  template: `
    <section
      dgResizeObserver
      [resizeDebounce]="100"
      [resizeEmitInitial]="true"
      (dgResize)="handleResize($event)"
    >
      Resizable content
    </section>
  `,
})
export class ExampleComponent {
  handleResize(event: DgResizeEvent): void {
    console.log(event.width, event.height);
  }
}
```

## Full example

```html
<div
  dgResizeObserver
  [resizeDebounce]="100"
  [resizeBox]="'border-box'"
  [resizeEmitInitial]="true"
  [resizeDistinct]="true"
  (dgResize)="onResize($event)"
></div>
```

## API

### Selector

`[dgResizeObserver]` — apply as an attribute on any element.

### Inputs

| Input               | Type                                                          | Default         | Description                                                                                          |
| ------------------- | ------------------------------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------- |
| `resizeDebounce`    | `number`                                                      | `0`             | Debounce in milliseconds. `0` emits synchronously. Negative / `NaN` / non-finite values become `0`.  |
| `resizeBox`         | `'content-box' \| 'border-box' \| 'device-pixel-content-box'` | `'content-box'` | Observation box passed to `observe`. Invalid values fall back to `content-box`. Reactive at runtime. |
| `resizeEmitInitial` | `boolean`                                                     | `false`         | Whether to emit the first measurement delivered when observation starts.                             |
| `resizeDistinct`    | `boolean`                                                     | `false`         | Suppress consecutive events with identical width and height.                                         |

All inputs use Angular's attribute coercion, so `resizeEmitInitial` /
`resizeDistinct` accept both bare attributes and `[bound]="expr"` syntax.

### Outputs

| Output     | Payload         | Description                     |
| ---------- | --------------- | ------------------------------- |
| `dgResize` | `DgResizeEvent` | Fires when the host is resized. |

### Event type

```ts
export type DgResizeBox =
  'content-box' | 'border-box' | 'device-pixel-content-box';

export interface DgResizeEvent {
  /** The element that was resized (the directive host). */
  readonly target: Element;
  /** The observed element's content rectangle. */
  readonly contentRect: DOMRectReadOnly;
  /** The original, untouched ResizeObserverEntry. */
  readonly entry: ResizeObserverEntry;
  /** Width of the observed box (see `box`). */
  readonly width: number;
  /** Height of the observed box. */
  readonly height: number;
  /** The box model these measurements were taken against. */
  readonly box: DgResizeBox;
  /** True when this was the initial measurement (see `resizeEmitInitial`). */
  readonly initial: boolean;
}
```

`width` / `height` are read from the box-specific `*BoxSize` array when
available (required for `device-pixel-content-box`), falling back to
`contentRect`. They assume a horizontal writing mode.

## Behavior details

### Debounce

- `resizeDebounce = 0` (default): events emit **synchronously** — no timer is
  scheduled.
- `resizeDebounce > 0`: only the most recent measurement within the window is
  emitted.
- The value is read per emission, so changing it at runtime takes effect
  immediately.
- Invalid values (negative, `NaN`, `Infinity`) are normalized to `0`.

### Initial emission

A native `ResizeObserver` always delivers one measurement immediately after
`observe()` is called. This directive treats that first callback as the
**initial** measurement:

- `resizeEmitInitial = false` (default): the initial measurement is suppressed;
  only later resizes emit.
- `resizeEmitInitial = true`: the initial measurement is emitted with
  `event.initial === true`.

The initial event flows through the same debounce/distinct pipeline as any other.

### Distinct

When `resizeDistinct = true`, an event is suppressed if its `width` **and**
`height` equal the previously emitted event's. The observation `box` is **not**
part of the comparison — only the numeric dimensions are compared.

### SSR

The directive is safe to import and use during server-side rendering. It:

- creates the observer in `ngOnInit`, never in a field initializer;
- guards on `isPlatformBrowser`, so nothing runs on the server;
- feature-detects `ResizeObserver` and stays inert (with a dev-mode warning) if
  it is missing.

No consumer-side guards are required.

## Browser support

Uses the native `ResizeObserver`, supported in all current evergreen browsers.
For very old browsers, load a
[polyfill](https://github.com/juggle/resize-observer) before your app bootstraps;
the directive picks up whatever global `ResizeObserver` is present. When no
implementation exists, the directive does nothing (and warns in dev mode) rather
than throwing.

## Known limitations

- `width` / `height` assume a horizontal (`horizontal-tb`) writing mode; for
  vertical writing modes read `entry` directly.
- `device-pixel-content-box` is not supported by every engine; when `observe`
  rejects the option the directive falls back to default (content-box)
  observation.
- One directive instance observes exactly one host element.

## Development

This package lives in the [`dgkit`](../../README.md) Nx monorepo.

```bash
pnpm nx build resize-observer        # ng-packagr production build
pnpm nx test resize-observer         # Jest + coverage
pnpm nx test-vitest resize-observer  # Vitest + coverage
pnpm nx lint resize-observer         # ESLint
pnpm nx typecheck resize-observer    # tsc --noEmit
```

## Testing

The behavioral suite is written once (`resize-observer.directive.shared-spec.ts`)
and executed by **both** Jest and Vitest, backed by a shared framework-agnostic
`ResizeObserver` mock. See [Development](#development) for the commands.

## Contributing

Contributions are welcome — see the repository
[CONTRIBUTING guide](../../CONTRIBUTING.md).

## License

[MIT](../../LICENSE) © Daniel Grynyk
