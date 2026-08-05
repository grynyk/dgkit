# @dgkit/clipboard

## 0.1.2

### Patch Changes

- da427e3: Patch release for the refreshed build/test toolchain (nx, eslint, vite,
  ng-packagr, jsdom, @analogjs/\*, @types/node) — no runtime behavior changes.

## 0.1.1

### Patch Changes

- c67c628: Fall back to the off-screen `textarea` + `execCommand` path when the async
  Clipboard API rejects at call time (for example when permission is denied),
  rather than only when the API is absent. If the fallback also fails, the
  original error is preserved on the operation state.

## 0.1.0

### Minor Changes

- b8fa8ca: Initial release: an SSR-safe Angular clipboard helper with signal-based
  operation state.

  - `injectClipboard(options?)` exposes `status()` (`idle` → `copying` →
    `copied`/`failed`), `error()`, `copied()` and `isSupported()` as signals,
    while `copy()` stays a plain async method that never rejects.
  - Falls back to an off-screen `<textarea>` + `execCommand('copy')` for insecure
    contexts and older browsers; the element is always removed, even on throw.
  - Configurable auto-reset of the status, cleared on destroy — and an in-flight
    copy never writes state into a destroyed host.

Managed by [Changesets](https://github.com/changesets/changesets).
