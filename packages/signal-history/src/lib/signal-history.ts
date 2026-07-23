import {
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
  untracked,
  type WritableSignal,
} from '@angular/core';

import type {
  DgSignalHistory,
  DgSignalHistoryOptions,
} from './signal-history.types';

/**
 * Attach undo/redo history to a writable signal.
 *
 * ```ts
 * const document = signal(initialDocument);
 * const history = signalHistory(document, { limit: 50, debounce: 300 });
 *
 * history.undo();
 * history.redo();
 * history.canUndo();
 * history.canRedo();
 * history.reset();
 * ```
 *
 * Changes are observed with an `effect`, so a burst of synchronous writes
 * collapses into a single undoable entry. Use {@link DgSignalHistory.transaction}
 * to group changes explicitly regardless of flush timing.
 *
 * Must be called from an injection context; tracking stops automatically when
 * that context is destroyed.
 */
export function signalHistory<T>(
  source: WritableSignal<T>,
  options: DgSignalHistoryOptions<T> = {},
): DgSignalHistory<T> {
  const { limit = 100, debounce = 0, equal = Object.is } = options;

  const destroyRef = inject(DestroyRef);

  const past = signal<readonly T[]>([]);
  const future = signal<readonly T[]>([]);

  /**
   * The value history considers "current". Undo/redo update it *before* writing
   * to `source`, so the watcher recognises its own writes without relying on
   * effect scheduling.
   */
  let last: T = untracked(source);

  let transactionDepth = 0;
  let transactionBaseline: T = last;
  let coalescing = false;
  let coalesceTimer: ReturnType<typeof setTimeout> | undefined;
  let destroyed = false;

  const hasLimit = Number.isFinite(limit) && limit > 0;

  function clearCoalesceTimer(): void {
    if (coalesceTimer !== undefined) {
      clearTimeout(coalesceTimer);
      coalesceTimer = undefined;
    }
  }

  /** Push `value` onto the past stack and invalidate the redo stack. */
  function push(value: T): void {
    past.update((entries) => {
      const next = [...entries, value];
      return hasLimit && next.length > limit
        ? next.slice(next.length - limit)
        : next;
    });
    future.set([]);
  }

  /** Record a change, honouring the debounce (coalescing) window. */
  function record(previous: T): void {
    if (debounce > 0 && Number.isFinite(debounce)) {
      // Only the first change of a burst creates an entry; later ones fold in.
      if (!coalescing) {
        push(previous);
        coalescing = true;
      }
      clearCoalesceTimer();
      coalesceTimer = setTimeout(() => {
        coalesceTimer = undefined;
        coalescing = false;
      }, debounce);
      return;
    }
    push(previous);
  }

  const watcher = effect(() => {
    const value = source();
    untracked(() => {
      if (destroyed || equal(value, last)) {
        return;
      }
      if (transactionDepth > 0) {
        // Committed as one entry when the transaction ends.
        last = value;
        return;
      }
      record(last);
      last = value;
    });
  });

  /** Write to `source` as a history-driven change (never re-recorded). */
  function apply(value: T): void {
    last = value;
    source.set(value);
  }

  function undo(): void {
    const entries = past();
    if (entries.length === 0) {
      return;
    }
    const previous = entries[entries.length - 1];
    future.update((entries2) => [last, ...entries2]);
    past.set(entries.slice(0, -1));
    // A burst must not swallow the next change after an undo.
    clearCoalesceTimer();
    coalescing = false;
    apply(previous);
  }

  function redo(): void {
    const entries = future();
    if (entries.length === 0) {
      return;
    }
    const next = entries[0];
    past.update((entries2) => [...entries2, last]);
    future.set(entries.slice(1));
    clearCoalesceTimer();
    coalescing = false;
    apply(next);
  }

  function reset(...args: [T?]): void {
    past.set([]);
    future.set([]);
    clearCoalesceTimer();
    coalescing = false;
    if (args.length > 0) {
      apply(args[0] as T);
    } else {
      last = untracked(source);
    }
  }

  function transaction(work: () => void): void {
    if (transactionDepth === 0) {
      transactionBaseline = last;
    }
    transactionDepth += 1;
    try {
      work();
    } finally {
      transactionDepth -= 1;
      if (transactionDepth === 0) {
        const current = untracked(source);
        if (!equal(current, transactionBaseline)) {
          // One entry for the whole transaction, independent of flush timing.
          clearCoalesceTimer();
          coalescing = false;
          push(transactionBaseline);
          last = current;
        }
      }
    }
  }

  function destroy(): void {
    if (destroyed) {
      return;
    }
    destroyed = true;
    clearCoalesceTimer();
    watcher.destroy();
  }

  destroyRef.onDestroy(destroy);

  return {
    undo,
    redo,
    canUndo: computed(() => past().length > 0),
    canRedo: computed(() => future().length > 0),
    reset,
    transaction,
    past: past.asReadonly(),
    future: future.asReadonly(),
    destroy,
  };
}
