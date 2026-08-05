# @dgkit/intersection-observer

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

Managed by [Changesets](https://github.com/changesets/changesets).
