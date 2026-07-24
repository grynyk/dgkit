---
'@dgkit/resize-observer': patch
'@dgkit/intersection-observer': patch
---

Internal cleanup: move the shared target-resolution helpers
(`resolveElement`/`toTargetAccessor`) into each package's `utils` module so the
signal API and directive consume one implementation. No public API or behaviour
change.
