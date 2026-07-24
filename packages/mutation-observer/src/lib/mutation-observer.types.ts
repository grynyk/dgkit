import type { ElementRef, Signal } from '@angular/core';

/**
 * Init options for a mutation observation.
 *
 * Mirrors the native `MutationObserverInit` dictionary — kept as a distinct,
 * package-owned alias (rather than importing it directly at every call site)
 * so consumers only ever import `Dg`-prefixed types from this package.
 */
export type DgMutationObserverInit = MutationObserverInit;

/**
 * One batch of mutations delivered by the underlying `MutationObserver`.
 *
 * A single event may bundle several native callback firings together when a
 * debounce is configured — `records` is the concatenation of every
 * `MutationRecord` observed since the previous emission.
 */
export interface DgMutationEvent {
  /** Every mutation record observed since the previous emission. */
  readonly records: readonly MutationRecord[];
  /** The node the observation was attached to. */
  readonly target: Node;
}

/**
 * A value that may be supplied directly or as a reactive accessor (any
 * zero-argument function, which includes Angular signals).
 */
export type DgValueOrAccessor<T> = T | (() => T);

/**
 * Something that resolves to the node to observe. Accepts a raw `Node`, an
 * `ElementRef`, or an accessor/signal returning either — so `viewChild()` can
 * be passed straight through.
 */
export type DgMutationTarget =
  | Node
  | ElementRef<Element>
  | (() => Node | ElementRef<Element> | undefined | null);

/** Options accepted by `injectMutationObserver`. */
export interface DgMutationObserverOptions {
  /**
   * The native observation init passed to `MutationObserver.observe`.
   * Reactive if an accessor. Defaults to `{ childList: true }` — the most
   * common case of "notify me when children are added or removed".
   *
   * If none of `childList`, `attributes` or `characterData` is `true` (the
   * native observer requires at least one), the request is normalized to
   * `{ childList: true }` rather than throwing.
   */
  readonly init?: DgValueOrAccessor<DgMutationObserverInit>;
  /**
   * Debounce in milliseconds. `0` (default) reports every callback batch
   * immediately. A positive value coalesces mutations observed within the
   * window into a single event whose `records` is the concatenation of every
   * batch — useful for "wait until the DOM settles" scenarios instead of
   * reacting to every intermediate mutation.
   */
  readonly debounce?: DgValueOrAccessor<number>;
}

/**
 * Signal-based view of a mutation observation, returned by
 * `injectMutationObserver`.
 *
 * The native observer callback writes directly into a signal — there is no
 * `NgZone`, no `ChangeDetectorRef`, and no assumption that zone.js is loaded.
 */
export interface DgMutationObserverRef {
  /** Records from the most recent emission, or `undefined` before the first. */
  readonly records: Signal<readonly MutationRecord[] | undefined>;
  /** The most recent full event, or `undefined` before the first emission. */
  readonly event: Signal<DgMutationEvent | undefined>;
  /**
   * Whether a usable `MutationObserver` exists in this environment. `false`
   * during SSR and in environments without support, in which case the
   * observation is simply inert.
   */
  readonly isSupported: Signal<boolean>;
}
