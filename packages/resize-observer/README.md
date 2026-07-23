# @dgkit/resize-observer

A lightweight, **standalone** and **SSR-safe** Angular wrapper around the native
[`ResizeObserver`](https://developer.mozilla.org/docs/Web/API/ResizeObserver)
API. Ships **two APIs over one engine** — a signal function and a directive —
tree-shakeable, with zero runtime dependencies beyond `tslib`.

- ✅ `injectResizeObserver()` — element size as **signals** (`width()`, `height()`)
- ✅ `[dgResizeObserver]` — standalone directive with a typed `(dgResize)` output
- ✅ SSR-safe — never touches `ResizeObserver` on the server, no consumer guards
- ✅ Zoneless-friendly — the native callback writes a signal; **no `NgZone`, no
  `ChangeDetectorRef`, no assumption that zone.js is loaded**
- ✅ Configurable debounce, observation box, initial emission and distinct mode
- ✅ Reactive config — pass signals for `box`/`debounce`; changes re-observe
- ✅ Robust teardown via `disconnect()` — no leaks

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

## Quick start — signal API (recommended)

```ts
import { Component, ElementRef, viewChild } from '@angular/core';
import { injectResizeObserver } from '@dgkit/resize-observer';

@Component({
  standalone: true,
  template: `
    <section #box>Resizable content</section>
    <p>{{ size.width() }} × {{ size.height() }}</p>
  `,
})
export class ExampleComponent {
  private readonly box = viewChild.required<ElementRef<HTMLElement>>('box');

  // Field initializers run in an injection context, so this is all you need.
  protected readonly size = injectResizeObserver(this.box, { debounce: 100 });
}
```

`injectResizeObserver` accepts a raw `Element`, an `ElementRef`, or an
accessor/signal returning either (so `viewChild()` is passed straight through).
Options may be plain values or signals; passing a signal makes them reactive.

## Quick start — directive

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

## Which API?

| Use…                     | When…                                                                                                                        |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `injectResizeObserver()` | you want the size as **state** to render or derive from (signals). Defaults to emitting the initial size and de-duplicating. |
| `[dgResizeObserver]`     | you want to **react to resize events** declaratively in a template. Defaults to suppressing the initial measurement.         |

Both share the same engine and options.

### Signal API reference

```ts
const size = injectResizeObserver(target, options?);
size.width();        // Signal<number>   — 0 before the first measurement
size.height();       // Signal<number>
size.entry();        // Signal<ResizeObserverEntry | undefined>
size.event();        // Signal<DgResizeEvent | undefined>
size.isSupported();  // Signal<boolean>  — false during SSR / when unsupported
```

Options: `box`, `debounce`, `emitInitial`, `distinct` — each a value **or** a
signal/accessor. `emitInitial` and `distinct` default to `true` here (a size
signal should hold the current size and not churn on identical measurements).

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
pnpm nx test resize-observer         # Vitest + coverage
pnpm nx lint resize-observer         # ESLint
pnpm nx typecheck resize-observer    # tsc --noEmit
```

## Testing

Run with `pnpm nx test resize-observer`. The suite covers the directive, the
signal API and the utilities separately, backed by a `ResizeObserver` mock that
can simulate multiple entries, unsupported box options and an environment where
the API is missing entirely. Coverage thresholds are enforced.

## Contributing

Contributions are welcome — see the repository
[CONTRIBUTING guide](../../CONTRIBUTING.md).

## License

[MIT](../../LICENSE) © Danylo Grynyk
