---
'@dgkit/clipboard': patch
---

Fall back to the off-screen `textarea` + `execCommand` path when the async
Clipboard API rejects at call time (for example when permission is denied),
rather than only when the API is absent. If the fallback also fails, the
original error is preserved on the operation state.
