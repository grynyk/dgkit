---
'@dgkit/signal-history': minor
---

Add `pause()`, `resume()` and `withoutRecording()` for suppressing history
recording without discarding it: writes made while paused update the signal but
are not pushed onto the undo stack. Also floor the `limit` option to a
non-negative integer so a fractional or negative limit can no longer produce an
unbounded or corrupt history.
