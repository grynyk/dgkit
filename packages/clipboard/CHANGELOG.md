# @dgkit/clipboard

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
