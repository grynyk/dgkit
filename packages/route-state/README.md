# @dgkit/route-state

**Type-safe, bidirectional synchronization between Angular signals and the URL.**

Imagine never writing this again:

```ts
const id = this.route.snapshot.paramMap.get('id');
const page = Number(this.route.snapshot.queryParamMap.get('page'));
const tab = this.route.snapshot.queryParamMap.get('tab');
```

Instead:

```ts
const route = injectRouteState({
  id: pathParam(numberParam()),
  page: numberParam(1),
  tab: stringParam('overview'),
  archived: booleanParam(false),
  sort: enumParam(Sort, Sort.Asc),
  statuses: arrayParam<string>(),
});

route.id(); // number | undefined  (read-only — it's a path param)
route.page(); // number
route.tab(); // string

route.page.set(4);
route.statuses.update((values) => [...values, 'active']);

route.patch({ page: 3, tab: 'history' }); // one navigation
route.reset(); // back to defaults
```

- ✅ **Typed codecs** — `string`, `number`, `boolean`, `enum`, arrays
- ✅ **Path _and_ query** params in one object
- ✅ **Bidirectional** — read _and_ write, batched via `patch()`
- ✅ **Clean URLs** — values equal to their default are removed
- ✅ **Back/forward** works — reads are driven by `ActivatedRoute`
- ✅ **Invalid URLs** degrade to defaults instead of throwing
- ✅ **SSR-safe** — reads work on the server, writes are ignored
- ✅ **History control** — replace (default) or push, per write

## Installation

```bash
pnpm add @dgkit/route-state
```

Requires `@angular/router` as a peer dependency.

## Compatibility

Works with **Angular 18, 19, 20 and 21**.

| Peer dependency   | Supported range      |
| ----------------- | -------------------- |
| `@angular/core`   | `>=18.0.0 <22.0.0`   |
| `@angular/common` | `>=18.0.0 <22.0.0`   |
| `@angular/router` | `>=18.0.0 <22.0.0`   |
| `rxjs`            | `^6.5.3` or `^7.4.0` |

Angular and RxJS are **peer dependencies** — never bundled into the package.

## Parameters

| Factory                              | Value type            | Notes                                         |
| ------------------------------------ | --------------------- | --------------------------------------------- |
| `stringParam(default = '')`          | `string`              |                                               |
| `numberParam(default?)`              | `number \| undefined` | Omit the default for an optional number.      |
| `booleanParam(default = false)`      | `boolean`             | Accepts `true/1/<bare flag>` and `false/0`.   |
| `enumParam(values, default?)`        | `T`                   | TS enum object **or** a literal array.        |
| `arrayParam<T>(default = [], opts?)` | `readonly T[]`        | Repeated keys: `?s=a&s=b`. Custom item codec. |
| `pathParam(param)`                   | —                     | Reads from the path; exposed **read-only**.   |

Every factory accepts `{ key }` to use a different URL key than the property
name:

```ts
size: numberParam(10, { key: 'ps' }); // reads/writes ?ps=…
```

### Why path params are read-only

Writing a path parameter means rewriting the route's path segments — which
depends on the route's shape and cannot be inferred safely. Path params are
therefore typed as plain `Signal<T>` with no `.set()`. Navigate explicitly with
the `Router` when you need to change one; the signal updates automatically.

## Options

```ts
injectRouteState(defs, {
  keepDefaults: false, // keep default values in the URL instead of omitting
  replaceUrl: true, // default history behaviour for writes
});
```

Per-write override:

```ts
route.page.set(2, { replaceUrl: false }); // push a history entry
route.patch({ tab: 'history' }, { replaceUrl: false });
```

## Behavior details

### Default elision

A parameter whose value equals its default is **removed** from the URL, keeping
links short and canonical. Set `keepDefaults: true` to always serialize.

### Merging

Writes use `queryParamsHandling: 'merge'`, so query params you don't manage are
preserved. `reset()` clears only the parameters declared in your definitions.

### Invalid input

`?page=abc`, an unknown enum member, or an unparsable array item degrade to the
default (array items that fail to parse are dropped individually) — the URL is
untrusted input and never throws.

### History

Query-state changes default to **replacing** the current history entry, so
paging and filtering don't fill the back stack. Opt into pushing per write, or
globally via `replaceUrl: false`.

### SSR

Reads work on the server (seeded from the route snapshot). Writes are ignored
with a dev-mode warning, since navigating during server rendering would fight
the incoming request.

## License

[MIT](../../LICENSE)
