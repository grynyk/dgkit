# Changesets

This folder is managed by [Changesets](https://github.com/changesets/changesets).

Each pull request that changes a published package should include a changeset:

```bash
pnpm changeset
```

Pick the affected package(s) and the semver bump (patch / minor / major), then
write a short human-readable summary. The generated markdown file lands here and
is consumed by `pnpm version-packages` to update versions and changelogs.

See the [common questions](https://github.com/changesets/changesets/blob/main/docs/common-questions.md).
