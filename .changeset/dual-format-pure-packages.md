---
'@dgkit/betting-math': minor
'@dgkit/blob-saver': minor
'@dgkit/format': minor
---

Ship CommonJS alongside ESM. These framework-free packages were built with
`ng-packagr`, which only emits the Angular Package Format — ESM-only, with no
`main` and no `require` condition in `exports`. Node 22.12+ papered over that
through `require(esm)`, so the packages appeared to work while failing outright
on Node 18 and 20, under CommonJS Jest, and in older bundlers.

They are now built with tsup into both formats, with per-format type
declarations and a full conditional `exports` map. Type resolution is verified
under `node16`, `nodenext`, `bundler` and legacy `node10`, and CI packs each
tarball and both `require()`s and `import`s it across Node 18/20/22/24.

Also: `tslib` is no longer declared as a dependency — it was never referenced
in the built output, so "zero runtime dependencies" is now true of the manifest
and not just the code. npm keywords no longer claim `angular`/`standalone`/`ssr`
on packages that have no framework dependency, and `@dgkit/betting-math`'s
description now covers the market, staking, hedging, promo and affiliate modules
added since it was written.
