import type { Signal } from '@angular/core';

/** Which `Storage` object to synchronize with. */
export type DgStorageKind = 'local' | 'session';

/** Pluggable (de)serialization for a stored value. */
export interface DgStorageSerializer<T> {
  /** Parse a raw string read from storage into `T`. May throw on bad input. */
  parse(raw: string): T;
  /** Serialize a value for storage. */
  stringify(value: T): string;
}

/** Options for `injectStorageSignal`. */
export interface DgStorageSignalOptions<T> {
  /** Which storage to use. Defaults to `'local'`. */
  readonly storage?: DgStorageKind;
  /**
   * Custom (de)serialization, for values `JSON.stringify`/`JSON.parse` can't
   * round-trip (e.g. `Date`, `Map`). Defaults to plain JSON.
   */
  readonly serializer?: DgStorageSerializer<T>;
  /**
   * Listen for the same key changing in another tab/window (via the native
   * `storage` event) and update the signal to match. Defaults to `true`.
   */
  readonly syncTabs?: boolean;
  /**
   * Debounce writes to storage, in milliseconds. `0` (default) writes
   * synchronously on every `set`/`update`. A pending debounced write is
   * always flushed on destroy, so it is never silently dropped.
   */
  readonly debounce?: number;
  /**
   * Equality function used to skip redundant signal updates (both for local
   * writes and incoming cross-tab changes). Defaults to Angular's standard
   * `Object.is`-based comparison.
   */
  readonly equal?: (a: T, b: T) => boolean;
}

/**
 * A storage-backed signal, returned by `injectStorageSignal`.
 *
 * Reads like a plain `Signal<T>`; `set`/`update` write through to storage
 * (subject to `debounce`), and `remove` clears the key and reverts to the
 * default value.
 */
export interface DgStorageSignalRef<T> extends Signal<T> {
  /** Write a new value — updates the signal and persists to storage. */
  set(value: T): void;
  /** Derive a new value from the current one and persist it. */
  update(updater: (current: T) => T): void;
  /** Remove the key from storage and reset the signal to its default value. */
  remove(): void;
  /**
   * Whether the requested storage is available in this environment. `false`
   * during SSR and when storage access throws (e.g. Safari private browsing).
   * The signal still works as in-memory-only state in that case.
   */
  readonly isSupported: Signal<boolean>;
}
