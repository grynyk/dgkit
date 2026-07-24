<div align="center">

# dgkit

**A growing collection of open-source frontend agnostic and Angular libraries, developer tools, and
frontend utilities.** Built with strict TypeScript, comprehensive testing,
automated releases, and a focus on simplicity, performance, and reliability.

Published under the [`@dgkit`](https://www.npmjs.com/org/dgkit) npm scope.

[![CI](https://github.com/grynyk/dgkit/actions/workflows/ci.yml/badge.svg)](https://github.com/grynyk/dgkit/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

</div>

---

Each package is independently **buildable, testable, versioned and publishable**,
built with modern Angular standalone + signals APIs, configured for tree-shaking,
and validated in CI with Vitest and enforced coverage thresholds.

## Packages

| Package                                                            | npm                                                                                                                             | Description                                                                                            |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| [`@dgkit/route-state`](./packages/route-state)                     | [![npm](https://img.shields.io/npm/v/@dgkit/route-state)](https://www.npmjs.com/package/@dgkit/route-state)                     | Type-safe, bidirectional sync between signals and route/query params.                                  |
| [`@dgkit/signal-storage`](./packages/signal-storage)               | [![npm](https://img.shields.io/npm/v/@dgkit/signal-storage)](https://www.npmjs.com/package/@dgkit/signal-storage)               | Type-safe, bidirectional sync between signals and localStorage/sessionStorage, with cross-tab updates. |
| [`@dgkit/resize-observer`](./packages/resize-observer)             | [![npm](https://img.shields.io/npm/v/@dgkit/resize-observer)](https://www.npmjs.com/package/@dgkit/resize-observer)             | SSR-safe `ResizeObserver` — signal API + directive.                                                    |
| [`@dgkit/intersection-observer`](./packages/intersection-observer) | [![npm](https://img.shields.io/npm/v/@dgkit/intersection-observer)](https://www.npmjs.com/package/@dgkit/intersection-observer) | SSR-safe `IntersectionObserver` — signal API + directive.                                              |
| [`@dgkit/mutation-observer`](./packages/mutation-observer)         | [![npm](https://img.shields.io/npm/v/@dgkit/mutation-observer)](https://www.npmjs.com/package/@dgkit/mutation-observer)         | SSR-safe `MutationObserver` — signal API + directive.                                                  |
| [`@dgkit/signal-history`](./packages/signal-history)               | [![npm](https://img.shields.io/npm/v/@dgkit/signal-history)](https://www.npmjs.com/package/@dgkit/signal-history)               | Undo/redo for signals, with grouped transactions.                                                      |
| [`@dgkit/clipboard`](./packages/clipboard)                         | [![npm](https://img.shields.io/npm/v/@dgkit/clipboard)](https://www.npmjs.com/package/@dgkit/clipboard)                         | Clipboard helper with signal-based operation state.                                                    |
| [`@dgkit/format`](./packages/format)                               | [![npm](https://img.shields.io/npm/v/@dgkit/format)](https://www.npmjs.com/package/@dgkit/format)                               | Framework-free, grapheme-safe string/number formatting.                                                |
| [`@dgkit/blob-download`](./packages/blob-download)                 | [![npm](https://img.shields.io/npm/v/@dgkit/blob-download)](https://www.npmjs.com/package/@dgkit/blob-download)                 | Framework-free helper for triggering a Blob download, with no memory leaks.                            |

Every package is standalone, tree-shakeable, SSR-safe and **zoneless-friendly** —
native callbacks write signals directly, with no `NgZone` and no assumption that
zone.js is loaded.

## Tech stack

- **[Nx](https://nx.dev)** — task running, caching and `affected` graph
- **[Yarn](https://yarnpkg.com)** workspaces
- **Angular 21** (standalone + signals), **TypeScript 5.9**, **RxJS 7**
- **[ng-packagr](https://github.com/ng-packagr/ng-packagr)** — Angular Package Format builds
- **Vitest** (+ Analog) — every package tested with enforced coverage thresholds
- **ESLint** (type-aware) + **Prettier**
- **[Changesets](https://github.com/changesets/changesets)** — independent versioning & changelogs
- **GitHub Actions** — CI + release with npm provenance

## Requirements

- **Node.js** `^20.19 || ^22.12 || ^24` (see [`.nvmrc`](./.nvmrc) → `24.13.0`)
- **Yarn** `>=4` (Berry, pinned via `packageManager` + Corepack)

```bash
nvm use            # picks up .nvmrc
corepack enable    # provisions Yarn 4 from packageManager
yarn install
```

## Common commands

```bash
yarn build                 # build every package (nx run-many -t build)
yarn test                  # Vitest + coverage across all packages
yarn lint                  # ESLint (type-aware)
yarn typecheck             # tsc --noEmit
yarn format                # Prettier write
yarn playground            # serve the demo app (nx serve playground)
yarn verify                # format:check + lint + typecheck + test + build
```

Target a single project with Nx:

```bash
yarn nx build resize-observer
yarn nx test resize-observer
```

## Adding a new package

```bash
yarn new:package media-query "Angular media-query utilities."
yarn new:package slugify "String slug helpers." --pure   # no Angular peers
```

This scaffolds `packages/<name>/` from the resize-observer template with its own
`package.json`, `project.json`, `ng-package.json`, tsconfigs, a Vitest config,
README and CHANGELOG, wired into the workspace. See
[`tools/create-package.mjs`](./tools/create-package.mjs).

## Repository layout

```text
dgkit/
├── packages/            # publishable @dgkit/* libraries
│   ├── route-state/
│   ├── signal-storage/
│   ├── resize-observer/
│   ├── intersection-observer/
│   ├── mutation-observer/
│   ├── signal-history/
│   ├── clipboard/
│   ├── format/
│   └── blob-download/
├── apps/
│   └── playground/      # manual verification app (not published)
├── tools/               # workspace tooling (package scaffolder)
├── .changeset/          # changesets config + pending changes
├── .github/workflows/   # CI + release
├── nx.json
├── .yarnrc.yml
├── tsconfig.base.json
├── eslint.config.mjs
└── prettier.config.mjs
```

## Releasing

Releases are driven by [Changesets](https://github.com/changesets/changesets):

```bash
yarn changeset             # describe your change (choose bump per package)
yarn version-packages      # apply versions + update changelogs
yarn release               # build + changeset publish (CI does this on main)
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full workflow.

## Contributing

Issues and PRs welcome. Please read [CONTRIBUTING.md](./CONTRIBUTING.md) and the
[Code of Conduct](./CODE_OF_CONDUCT.md).

## License

[MIT](./LICENSE) © Danylo Grynyk
