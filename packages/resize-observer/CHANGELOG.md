# @dgkit/resize-observer

## 0.1.2

### Patch Changes

- da427e3: Patch release for the refreshed build/test toolchain (nx, eslint, vite,
  ng-packagr, jsdom, @analogjs/\*, @types/node) — no runtime behavior changes.

## 0.1.1

### Patch Changes

- 5a0a200: Internal cleanup: move the shared target-resolution helpers
  (`resolveElement`/`toTargetAccessor`) into each package's `utils` module so the
  signal API and directive consume one implementation. No public API or behaviour
  change.

## 0.1.0

### Minor Changes

- b8fa8ca: Initial release: a standalone, SSR-safe Angular wrapper around the native
  `ResizeObserver`, shipping two APIs over one engine.

  - `injectResizeObserver(target, options?)` — element size as signals
    (`width()`, `height()`, `entry()`, `event()`, `isSupported()`). Accepts a raw
    `Element`, an `ElementRef`, or an accessor/signal (so `viewChild()` passes
    straight through), and re-observes when the target changes.
  - `[dgResizeObserver]` — directive with a typed `(dgResize)` output.
  - Zoneless-friendly: the native callback writes a signal — no `NgZone`, no
    `ChangeDetectorRef`, no assumption that zone.js is loaded.
  - Configurable debounce (`0` emits synchronously), observation box, initial
    emission and duplicate suppression; options may be signals.
  - Normalizes invalid input (negative/`NaN`/infinite debounce, unknown box) and
    falls back when an engine rejects a box option.
  - SSR-safe via `isPlatformBrowser` + feature detection; teardown uses
    `disconnect()`.

Managed by [Changesets](https://github.com/changesets/changesets).
