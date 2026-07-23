# @dgkit/intersection-observer

A lightweight, **standalone** and **SSR-safe** Angular wrapper around the native
[`IntersectionObserver`](https://developer.mozilla.org/docs/Web/API/IntersectionObserver)
API. Ships **two APIs over one engine** — a signal function and a directive.

Useful for lazy content, analytics, scroll-triggered animations and infinite
scrolling.

- ✅ `injectIntersectionObserver()` — visibility as **signals**
- ✅ `[dgIntersectionObserver]` — directive with a typed `(dgIntersect)` output
- ✅ SSR-safe — nothing touched on the server, no consumer guards
- ✅ Zoneless-friendly — the native callback writes a signal; no `NgZone`
- ✅ `once` mode — auto-disconnects after the first intersection
- ✅ Reactive options — pass signals for `root`/`rootMargin`/`threshold`

## Installation

```bash
pnpm add @dgkit/intersection-observer
```

## Quick start — signal API

```ts
import { Component, ElementRef, viewChild } from '@angular/core';
import { injectIntersectionObserver } from '@dgkit/intersection-observer';

@Component({
  standalone: true,
  template: `
    <div #anchor></div>
    @if (visibility.isIntersecting()) {
      <p>Visible! ({{ visibility.ratio() }})</p>
    }
  `,
})
export class LazySection {
  private readonly anchor = viewChild.required<ElementRef>('anchor');

  protected readonly visibility = injectIntersectionObserver(this.anchor, {
    rootMargin: '200px',
    once: true,
  });
}
```

## Quick start — directive

```html
<div
  dgIntersectionObserver
  [intersectRootMargin]="'200px'"
  [intersectThreshold]="[0, 0.5, 1]"
  [intersectOnce]="true"
  (dgIntersect)="onIntersect($event)"
></div>
```

## API

### `injectIntersectionObserver(target, options?)`

`target` accepts a raw `Element`, an `ElementRef`, or an accessor/signal
returning either (so `viewChild()` passes straight through).

```ts
visibility.isIntersecting(); // Signal<boolean>
visibility.ratio(); // Signal<number>  0–1
visibility.entry(); // Signal<IntersectionObserverEntry | undefined>
visibility.event(); // Signal<DgIntersectEvent | undefined>
visibility.isSupported(); // Signal<boolean>
```

### Options / inputs

| Option (signal API) | Directive input        | Type                          | Default   |
| ------------------- | ---------------------- | ----------------------------- | --------- |
| `root`              | `intersectRoot`        | `Element \| Document \| null` | `null`    |
| `rootMargin`        | `intersectRootMargin`  | `string`                      | `'0px'`   |
| `threshold`         | `intersectThreshold`   | `number \| number[]`          | `0`       |
| `once`              | `intersectOnce`        | `boolean`                     | `false`   |
| `emitInitial`       | `intersectEmitInitial` | `boolean`                     | see below |

Each signal-API option may be a plain value **or** a signal/accessor. Because
`IntersectionObserver` options are fixed at construction, changing `root`,
`rootMargin` or `threshold` transparently recreates the observer.

### Event type

```ts
interface DgIntersectEvent {
  readonly target: Element;
  readonly entry: IntersectionObserverEntry;
  readonly isIntersecting: boolean;
  readonly ratio: number;
  readonly boundingClientRect: DOMRectReadOnly;
  readonly intersectionRect: DOMRectReadOnly;
  readonly rootBounds: DOMRectReadOnly | null;
  readonly time: number;
}
```

## Behavior details

### Initial callback

A native `IntersectionObserver` delivers one callback immediately after
`observe()`, reporting the current state. That first callback is treated as the
**initial** one:

- signal API: `emitInitial` defaults to **`true`** — the signals should reflect
  current visibility straight away;
- directive: `intersectEmitInitial` defaults to **`false`** — you usually only
  want to react to _changes_.

### `once`

When enabled, the observer is disconnected as soon as the target intersects —
the canonical lazy-load / fire-once-analytics pattern. Non-intersecting
callbacks do not trigger it.

### Normalization

`rootMargin` falls back to `'0px'` for empty/non-string values; `threshold` is
clamped into `0`–`1` (arrays are filtered and clamped, invalid values become
`0`).

### SSR

Nothing is created and no browser global is touched on the server;
`isSupported()` is `false` and the signals keep their defaults. Where the API is
missing in a browser, the package warns once in dev mode and stays inert.

## License

[MIT](../../LICENSE) © Danylo Grynyk
