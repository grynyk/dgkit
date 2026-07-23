---
'@dgkit/intersection-observer': minor
---

Initial release: a standalone, SSR-safe Angular wrapper around the native
`IntersectionObserver`.

- `injectIntersectionObserver(target, options?)` — visibility as signals
  (`isIntersecting()`, `ratio()`, `entry()`, `event()`, `isSupported()`).
- `[dgIntersectionObserver]` — directive with a typed `(dgIntersect)` output.
- `once` mode auto-disconnects after the first intersection — the canonical
  lazy-load / fire-once-analytics pattern.
- Reactive `root`, `rootMargin` and `threshold`; because native options are
  fixed at construction, changing them transparently recreates the observer.
- Normalizes invalid `rootMargin`/`threshold` values; SSR-safe and
  zoneless-friendly.
