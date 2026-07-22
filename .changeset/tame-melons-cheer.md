---
'@dgkit/resize-observer': minor
---

Initial release of `@dgkit/resize-observer`: a standalone, SSR-safe Angular
directive around the native `ResizeObserver`.

- `[dgResizeObserver]` attribute directive with a typed `(dgResize)` output
- Signal inputs: `resizeDebounce`, `resizeBox`, `resizeEmitInitial`,
  `resizeDistinct` — all reactive at runtime
- Synchronous emission when debounce is `0`; normalizes negative/`NaN`/infinite
  values
- Optional initial-measurement emission and duplicate-size suppression
- Feature detection + `isPlatformBrowser` guards for full SSR safety
- Robust teardown via `disconnect()` and completed streams
- Package-owned `DgResizeEvent` / `DgResizeBox` types
