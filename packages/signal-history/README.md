# @dgkit/signal-history

**Undo/redo for Angular signals.** Attach history to any `WritableSignal` and
get `undo()`, `redo()`, `canUndo()`, `canRedo()` — all signals, so they drop
straight into templates and `computed()`s.

Useful for editors, dashboards, configuration screens, drag-and-drop builders,
filters and complex forms.

- ✅ Works with any existing `WritableSignal` — no wrapper type to adopt
- ✅ Grouped **transactions** — many writes, one undo step
- ✅ **Debounce** mode — coalesce keystrokes into one entry
- ✅ Bounded memory via `limit`
- ✅ Custom equality — ignore structurally identical values
- ✅ Automatic teardown with the injection context

## Installation

```bash
pnpm add @dgkit/signal-history
```

## Quick start

```ts
import { signal } from '@angular/core';
import { signalHistory } from '@dgkit/signal-history';

const document = signal(initialDocument);

const history = signalHistory(document, {
  limit: 50,
  debounce: 300,
});

history.undo();
history.redo();
history.canUndo(); // Signal<boolean>
history.canRedo(); // Signal<boolean>
history.reset();
```

In a component:

```ts
@Component({
  standalone: true,
  template: `
    <button (click)="history.undo()" [disabled]="!history.canUndo()">
      Undo
    </button>
    <button (click)="history.redo()" [disabled]="!history.canRedo()">
      Redo
    </button>
  `,
})
export class Editor {
  protected readonly doc = signal({ title: '', description: '' });
  protected readonly history = signalHistory(this.doc, { debounce: 300 });
}
```

## Transactions

Group several writes into a single undoable step:

```ts
history.transaction(() => {
  document.update(updateTitle);
  document.update(updateDescription);
});

history.undo(); // reverts both at once
```

Transactions nest — only the outermost one commits an entry — and the depth is
restored even if the callback throws.

## API

```ts
const history = signalHistory(source, options?);

history.undo();
history.redo();
history.canUndo();   // Signal<boolean>
history.canRedo();   // Signal<boolean>
history.reset();     // clear history, keep the current value
history.reset(value) // clear history and set a new baseline value
history.transaction(fn);
history.past();      // Signal<readonly T[]>  oldest first
history.future();    // Signal<readonly T[]>  next-to-redo first
history.destroy();   // stop tracking early (also automatic on destroy)
```

### Options

| Option     | Type                      | Default     | Description                                                       |
| ---------- | ------------------------- | ----------- | ----------------------------------------------------------------- |
| `limit`    | `number`                  | `100`       | Max past entries; oldest dropped. `0`/non-finite means unlimited. |
| `debounce` | `number`                  | `0`         | Coalesce changes arriving within this window into one entry.      |
| `equal`    | `(a: T, b: T) => boolean` | `Object.is` | Decides whether a change is worth recording.                      |

## Behavior details

### How changes are observed

History watches the source with an `effect`. A burst of **synchronous** writes
therefore collapses into a single entry naturally — the watcher sees the final
value once per flush. Use `transaction()` when you need that grouping guaranteed
regardless of flush timing.

Undo/redo/reset update the internal "current" marker _before_ writing to the
source, so history never re-records its own writes — this is timing-independent
and doesn't rely on effect scheduling order.

### Redo invalidation

Any new change clears the redo stack, matching standard editor semantics.

### Memory

`limit` bounds the past stack. Values are stored by reference — if you mutate
objects in place rather than replacing them, history will hold the same mutated
reference. Prefer immutable updates (`update(x => ({...x, …}))`).

## License

[MIT](../../LICENSE) © Danylo Grynyk
