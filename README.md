<div align="center">

# dgkit

**A growing collection of open-source Angular libraries, developer tools, and
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

| Package                                                            | Description                                                           |
| ------------------------------------------------------------------ | --------------------------------------------------------------------- |
| [`@dgkit/route-state`](./packages/route-state)                     | Type-safe, bidirectional sync between signals and route/query params. |
| [`@dgkit/resize-observer`](./packages/resize-observer)             | SSR-safe `ResizeObserver` — signal API + directive.                   |
| [`@dgkit/intersection-observer`](./packages/intersection-observer) | SSR-safe `IntersectionObserver` — signal API + directive.             |
| [`@dgkit/signal-history`](./packages/signal-history)               | Undo/redo for signals, with grouped transactions.                     |
| [`@dgkit/clipboard`](./packages/clipboard)                         | Clipboard helper with signal-based operation state.                   |
| [`@dgkit/format`](./packages/format)                               | Framework-free, grapheme-safe string/number formatting.               |

Every package is standalone, tree-shakeable, SSR-safe and **zoneless-friendly** —
native callbacks write signals directly, with no `NgZone` and no assumption that
zone.js is loaded.

Planned: `@dgkit/media-query`, `@dgkit/viewport`, `@dgkit/click-outside`,
`@dgkit/storage`.

## Tech stack

- **[Nx](https://nx.dev)** — task running, caching and `affected` graph
- **[pnpm](https://pnpm.io)** workspaces
- **Angular 21** (standalone + signals), **TypeScript 5.9**, **RxJS 7**
- **[ng-packagr](https://github.com/ng-packagr/ng-packagr)** — Angular Package Format builds
- **Vitest** (+ Analog) — every package tested with enforced coverage thresholds
- **ESLint** (type-aware) + **Prettier**
- **[Changesets](https://github.com/changesets/changesets)** — independent versioning & changelogs
- **GitHub Actions** — CI + release with npm provenance

## Requirements

- **Node.js** `^20.19 || ^22.12 || ^24` (see [`.nvmrc`](./.nvmrc) → `24.13.0`)
- **pnpm** `>=10` (pinned via `packageManager`)

```bash
nvm use            # picks up .nvmrc
corepack enable    # or: npm i -g pnpm@10
pnpm install
```

## Common commands

```bash
pnpm build                 # build every package (nx run-many -t build)
pnpm test                  # Vitest + coverage across all packages
pnpm lint                  # ESLint (type-aware)
pnpm typecheck             # tsc --noEmit
pnpm format                # Prettier write
pnpm playground            # serve the demo app (nx serve playground)
pnpm verify                # format:check + lint + typecheck + test + build
```

Target a single project with Nx:

```bash
pnpm nx build resize-observer
pnpm nx test resize-observer
```

## Adding a new package

```bash
pnpm new:package media-query "Angular media-query utilities."
pnpm new:package slugify "String slug helpers." --pure   # no Angular peers
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
│   ├── resize-observer/
│   ├── intersection-observer/
│   ├── signal-history/
│   ├── clipboard/
│   └── format/
├── apps/
│   └── playground/      # manual verification app (not published)
├── tools/               # workspace tooling (package scaffolder)
├── .changeset/          # changesets config + pending changes
├── .github/workflows/   # CI + release
├── nx.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── eslint.config.mjs
└── prettier.config.mjs
```

## Releasing

Releases are driven by [Changesets](https://github.com/changesets/changesets):

```bash
pnpm changeset             # describe your change (choose bump per package)
pnpm version-packages      # apply versions + update changelogs
pnpm release               # build + changeset publish (CI does this on main)
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full workflow.

## Contributing

Issues and PRs welcome. Please read [CONTRIBUTING.md](./CONTRIBUTING.md) and the
[Code of Conduct](./CODE_OF_CONDUCT.md).

## License

[MIT](./LICENSE) © Danylo Grynyk
