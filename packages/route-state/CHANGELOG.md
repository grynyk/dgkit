# @dgkit/route-state

## 0.1.0

### Minor Changes

- b8fa8ca: Initial release: type-safe, bidirectional synchronization between Angular
  signals and route/query parameters.

  - `injectRouteState(defs, options?)` returns one signal per parameter plus
    `patch()` and `reset()` batch helpers.
  - Typed codecs: `stringParam`, `numberParam`, `booleanParam`, `enumParam`
    (enum object or literal array), `arrayParam` (repeated keys, custom item
    codec), and `pathParam()` to read from the path.
  - Path parameters are exposed as read-only `Signal`s — writing one would mean
    rewriting path segments, which this package deliberately does not guess at.
  - Clean URLs: values equal to their default are removed (opt out with
    `keepDefaults`). Writes merge, so unmanaged query params survive.
  - History control: replaces by default, push per write or globally via
    `replaceUrl`.
  - Invalid URL input degrades to defaults instead of throwing; browser
    back/forward flows through automatically.
  - SSR-safe: reads work on the server, writes are ignored with a dev warning.

Managed by [Changesets](https://github.com/changesets/changesets).
