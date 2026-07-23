---
'@dgkit/resize-observer': minor
---

Initial release: a standalone, SSR-safe Angular wrapper around the native
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
