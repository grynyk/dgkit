import type { ElementRef, Signal } from '@angular/core';

/** A value supplied directly or via a zero-argument accessor (e.g. a signal). */
export type DgValueOrAccessor<T> = T | (() => T);

/** Resolves to the element to observe (raw, `ElementRef`, or accessor). */
export type DgIntersectionTarget =
  | Element
  | ElementRef<Element>
  | (() => Element | ElementRef<Element> | undefined | null);

/**
 * Payload describing a single intersection change. Package-owned and stable —
 * exposes the values consumers usually need while still forwarding the raw
 * {@link IntersectionObserverEntry}.
 */
export interface DgIntersectEvent {
  /** The observed element. */
  readonly target: Element;
  /** The original, untouched `IntersectionObserverEntry`. */
  readonly entry: IntersectionObserverEntry;
  /** Whether the target currently intersects the root. */
  readonly isIntersecting: boolean;
  /** Ratio of the target that is visible, `0`–`1`. */
  readonly ratio: number;
  /** The target's bounding rectangle at the time of the callback. */
  readonly boundingClientRect: DOMRectReadOnly;
  /** The visible (intersecting) rectangle. */
  readonly intersectionRect: DOMRectReadOnly;
  /** The root's bounding rectangle, or `null`. */
  readonly rootBounds: DOMRectReadOnly | null;
  /** Timestamp (`DOMHighResTimeStamp`) of the change. */
  readonly time: number;
}

/** Options accepted by `injectIntersectionObserver` / the directive. */
export interface DgIntersectionObserverOptions {
  /** The root to intersect against. `null`/omitted means the viewport. */
  readonly root?: DgValueOrAccessor<Element | Document | null>;
  /** Margin around the root, CSS-like. Defaults to `'0px'`. */
  readonly rootMargin?: DgValueOrAccessor<string>;
  /** One or more thresholds in `0`–`1`. Defaults to `0`. */
  readonly threshold?: DgValueOrAccessor<number | number[]>;
  /** Stop observing after the first time the target intersects. */
  readonly once?: DgValueOrAccessor<boolean>;
  /**
   * Whether the initial callback delivered when observation starts is
   * reported. Defaults to `true`.
   */
  readonly emitInitial?: DgValueOrAccessor<boolean>;
}

/** Signal-based view of an element's intersection state. */
export interface DgIntersectionObserverRef {
  /** Whether the target currently intersects the root. */
  readonly isIntersecting: Signal<boolean>;
  /** Visible ratio of the target, `0`–`1`. */
  readonly ratio: Signal<number>;
  /** The most recent raw entry, or `undefined` before the first callback. */
  readonly entry: Signal<IntersectionObserverEntry | undefined>;
  /** The most recent full event, or `undefined` before the first callback. */
  readonly event: Signal<DgIntersectEvent | undefined>;
  /** Whether a usable `IntersectionObserver` exists in this environment. */
  readonly isSupported: Signal<boolean>;
}
