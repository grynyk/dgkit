import type { Signal } from '@angular/core';

/**
 * Lifecycle of the most recent copy operation.
 *
 * - `idle` — nothing copied yet (or the status has been reset);
 * - `copying` — a copy is in flight;
 * - `copied` — the last copy succeeded;
 * - `failed` — the last copy failed (see `error()`).
 */
export type DgClipboardStatus = 'idle' | 'copying' | 'copied' | 'failed';

/** Options for `injectClipboard`. */
export interface DgClipboardOptions {
  /**
   * How long (ms) the `copied` / `failed` status lingers before reverting to
   * `idle`. `0` disables the automatic reset. Defaults to `2000`.
   */
  readonly resetAfter?: number;
  /**
   * Allow the legacy `document.execCommand('copy')` fallback when the async
   * Clipboard API is unavailable (insecure context, older browsers).
   * Defaults to `true`.
   */
  readonly fallback?: boolean;
}

/**
 * Signal-based clipboard helper.
 *
 * The operation itself stays an async method; only the observable *state* is
 * exposed as signals.
 */
export interface DgClipboardRef {
  /** Copy `value` to the clipboard. Resolves `true` on success. */
  copy(value: string): Promise<boolean>;
  /** Current operation status. */
  readonly status: Signal<DgClipboardStatus>;
  /** The error from the last failed copy, or `undefined`. */
  readonly error: Signal<unknown>;
  /** The most recently copied value, or `undefined`. */
  readonly copied: Signal<string | undefined>;
  /** Whether copying is possible in this environment. */
  readonly isSupported: Signal<boolean>;
  /** Reset `status`/`error` back to `idle` immediately. */
  reset(): void;
}
