---
'@dgkit/format': minor
---

Add an optional `locale` to `fileSize` so the grouping and decimal separators
are deterministic instead of depending on the host's default locale. The
formatted number is produced via `toLocaleString(locale, …)`; omit `locale` to
keep the previous host-default behaviour.
