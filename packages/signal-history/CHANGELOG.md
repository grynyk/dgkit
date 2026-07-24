# @dgkit/signal-history

## 0.1.0

### Minor Changes

- b8fa8ca: Initial release: undo/redo history for Angular signals.

  - `signalHistory(source, options?)` adds `undo()`, `redo()`, `canUndo()`,
    `canRedo()`, `reset()`, `past()` and `future()` to any `WritableSignal`.
  - `transaction(fn)` groups many writes into a single undoable step; nests
    correctly and restores depth even if the callback throws.
  - `debounce` coalesces rapid changes (e.g. keystrokes) into one entry;
    `limit` bounds memory; `equal` customizes what counts as a change.
  - Undo/redo update the internal marker before writing, so history never
    re-records its own writes — independent of effect scheduling.

Managed by [Changesets](https://github.com/changesets/changesets).
