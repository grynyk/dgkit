/**
 * The observation box a {@link ResizeObserverDirective} tracks.
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
 * Payload emitted by the `dgResize` output.
 *
 * The interface is intentionally stable and package-owned: it exposes the
 * measurements consumers usually need (`width`/`height`) while still forwarding
 * the raw {@link ResizeObserverEntry} for advanced use-cases. No private
 * implementation detail of the directive is leaked.
 */
export interface DgResizeEvent {
  /** The element that was resized (the directive host). */
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
   * `true` when this event is the very first measurement delivered right after
   * observation started (see the `resizeEmitInitial` input), otherwise `false`.
   */
  readonly initial: boolean;
}
