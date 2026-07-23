import type { ElementRef, Signal } from '@angular/core';

/**
 * The observation box a resize observation tracks.
 *
 * Mirrors the values accepted by the native `ResizeObserverOptions.box`, but is
 * owned by this package so consumers do not have to depend on lib.dom typings
 * that vary between TypeScript versions.
 *
 * - `content-box` — the element's content box (default).
 * - `border-box` — the content box plus padding and border.
 * - `device-pixel-content-box` — the content box measured in physical device
 *   pixels. Not supported by every browser; the directive degrades gracefully.
 */
export type DgResizeBox =
  'content-box' | 'border-box' | 'device-pixel-content-box';

/**
 * Payload describing a single resize measurement.
 *
 * The interface is intentionally stable and package-owned: it exposes the
 * measurements consumers usually need (`width`/`height`) while still forwarding
 * the raw {@link ResizeObserverEntry} for advanced use-cases.
 */
export interface DgResizeEvent {
  /** The element that was resized. */
  readonly target: Element;
  /** The observed element's content rectangle at the time of the event. */
  readonly contentRect: DOMRectReadOnly;
  /** The original, untouched `ResizeObserverEntry` behind this event. */
  readonly entry: ResizeObserverEntry;
  /**
   * Width of the observed box (see {@link DgResizeEvent.box}), in CSS pixels
   * — or physical device pixels for `device-pixel-content-box`. Falls back to
   * `contentRect.width` when the matching `*BoxSize` array is unavailable.
   */
  readonly width: number;
  /** Height of the observed box. See {@link DgResizeEvent.width}. */
  readonly height: number;
  /** The box model these measurements were taken against. */
  readonly box: DgResizeBox;
  /**
   * `true` when this event is the first measurement delivered right after
   * observation started, otherwise `false`.
   */
  readonly initial: boolean;
}

/**
 * A value that may be supplied directly or as a reactive accessor (any
 * zero-argument function, which includes Angular signals).
 */
export type DgValueOrAccessor<T> = T | (() => T);

/**
 * Something that resolves to the element to observe. Accepts a raw `Element`,
 * an `ElementRef`, or an accessor/signal returning either — so `viewChild()`
 * can be passed straight through.
 */
export type DgResizeTarget =
  | Element
  | ElementRef<Element>
  | (() => Element | ElementRef<Element> | undefined | null);

/** Options accepted by `injectResizeObserver`. */
export interface DgResizeObserverOptions {
  /** Observation box. Defaults to `content-box`. Reactive if an accessor. */
  readonly box?: DgValueOrAccessor<DgResizeBox>;
  /**
   * Debounce in milliseconds. `0` (default) updates synchronously. Negative,
   * `NaN` and non-finite values are normalized to `0`.
   */
  readonly debounce?: DgValueOrAccessor<number>;
  /**
   * Whether the first measurement delivered when observation starts is
   * reported. Defaults to `true` for the signal API — a size signal is
   * expected to hold the current size immediately.
   */
  readonly emitInitial?: DgValueOrAccessor<boolean>;
  /**
   * Suppress consecutive measurements with identical width and height.
   * Defaults to `true` for the signal API.
   */
  readonly distinct?: DgValueOrAccessor<boolean>;
}

/**
 * Signal-based view of an element's size, returned by `injectResizeObserver`.
 *
 * The native observer callback writes directly into a signal — there is no
 * `NgZone`, no `ChangeDetectorRef`, and no assumption that zone.js is loaded.
 */
export interface DgResizeObserverRef {
  /** Current width of the observed box, or `0` before the first measurement. */
  readonly width: Signal<number>;
  /** Current height of the observed box, or `0` before the first measurement. */
  readonly height: Signal<number>;
  /** The most recent raw entry, or `undefined` before the first measurement. */
  readonly entry: Signal<ResizeObserverEntry | undefined>;
  /** The most recent full event, or `undefined` before the first measurement. */
  readonly event: Signal<DgResizeEvent | undefined>;
  /**
   * Whether a usable `ResizeObserver` exists in this environment. `false`
   * during SSR and in browsers without support, in which case the size signals
   * simply stay at their defaults.
   */
  readonly isSupported: Signal<boolean>;
}
