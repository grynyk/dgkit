import type { Signal } from '@angular/core';

/** Options for `signalHistory`. */
export interface DgSignalHistoryOptions<T> {
  /**
   * Maximum number of past entries retained. When exceeded, the oldest entries
   * are dropped. `0` or a non-finite value means unlimited. Defaults to `100`.
   */
  readonly limit?: number;
  /**
   * Coalesce rapid consecutive changes into a single history entry: while
   * changes keep arriving within this many milliseconds, they replace the
   * pending entry instead of adding a new one. `0` (default) records every
   * change. Ideal for text inputs.
   */
  readonly debounce?: number;
  /**
   * Equality used to decide whether a change is worth recording. Defaults to
   * `Object.is`. Supply a deep-equality function for object state if you want
   * structurally identical values ignored.
   */
  readonly equal?: (a: T, b: T) => boolean;
}

/**
 * Undo/redo history attached to a writable signal.
 *
 * Every API member is a signal or a plain method, so it composes directly into
 * templates and `computed()`s.
 */
export interface DgSignalHistory<T> {
  /** Step back one entry. No-op when {@link canUndo} is `false`. */
  undo(): void;
  /** Step forward one entry. No-op when {@link canRedo} is `false`. */
  redo(): void;
  /** Whether there is a past entry to return to. */
  readonly canUndo: Signal<boolean>;
  /** Whether there is a future entry to return to. */
  readonly canRedo: Signal<boolean>;
  /**
   * Drop all history, keeping the current value as the new baseline. Pass a
   * value to also reset the source signal to it.
   */
  reset(value?: T): void;
  /**
   * Run `work` as a single undoable step: every change made inside collapses
   * into one history entry.
   */
  transaction(work: () => void): void;
  /** Snapshot of past values, oldest first (excludes the current value). */
  readonly past: Signal<readonly T[]>;
  /** Snapshot of future values, next-to-redo first. */
  readonly future: Signal<readonly T[]>;
  /** Stop tracking. Called automatically when the injection context is destroyed. */
  destroy(): void;
}
