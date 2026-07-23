import type { DgResizeBox, DgResizeEvent } from './resize-observer.types';

/** All valid observation boxes, used for runtime input validation. */
export const DG_RESIZE_BOXES: readonly DgResizeBox[] = [
  'content-box',
  'border-box',
  'device-pixel-content-box',
];

/** The box used when none is provided or an invalid value is supplied. */
export const DG_DEFAULT_RESIZE_BOX: DgResizeBox = 'content-box';

/**
 * Coerce an arbitrary runtime value into a valid {@link DgResizeBox}.
 *
 * Anything that is not one of the three supported strings (including
 * `null`/`undefined` or a typo passed from a template) falls back to
 * `content-box` so the directive can never hand an invalid option to the
 * native observer.
 */
export function normalizeBox(value: unknown): DgResizeBox {
  return DG_RESIZE_BOXES.includes(value as DgResizeBox)
    ? (value as DgResizeBox)
    : DG_DEFAULT_RESIZE_BOX;
}

/**
 * Normalize a debounce duration in milliseconds.
 *
 * Negative, `NaN` and non-finite values (e.g. `Infinity`) are treated as `0`,
 * which the directive interprets as "emit synchronously, no debounce".
 */
export function normalizeDebounce(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

/**
 * Feature-detect the native `ResizeObserver`.
 *
 * Returns `false` under SSR (no `ResizeObserver` on the server global) and in
 * test or legacy browser environments where the API is absent, allowing the
 * directive to degrade gracefully instead of throwing.
 */
export function isResizeObserverSupported(): boolean {
  return (
    typeof ResizeObserver !== 'undefined' &&
    typeof ResizeObserver === 'function'
  );
}

/**
 * Select the entry that corresponds to `target` from a callback batch.
 *
 * A `ResizeObserver` callback may receive multiple entries. Each directive
 * instance observes a single host, so we prefer the entry whose `target`
 * matches; if none matches we fall back to the most recent entry so a
 * measurement is never silently dropped.
 */
export function pickEntry(
  entries: readonly ResizeObserverEntry[],
  target: Element,
): ResizeObserverEntry | undefined {
  if (entries.length === 0) {
    return undefined;
  }
  return (
    entries.find((entry) => entry.target === target) ??
    entries[entries.length - 1]
  );
}

/**
 * Read the width/height of the requested box from a `ResizeObserverEntry`.
 *
 * The dedicated `*BoxSize` arrays are preferred (they exist on all modern
 * engines and are required for `device-pixel-content-box`), falling back to the
 * always-present `contentRect` when a given array is unavailable. Sizes assume
 * a horizontal writing mode, where `inlineSize` is width and `blockSize` is
 * height.
 */
export function readBoxSize(
  entry: ResizeObserverEntry,
  box: DgResizeBox,
): { readonly width: number; readonly height: number } {
  const size = selectBoxSizeArray(entry, box);
  const first = size?.[0];
  if (first) {
    return { width: first.inlineSize, height: first.blockSize };
  }
  return { width: entry.contentRect.width, height: entry.contentRect.height };
}

function selectBoxSizeArray(
  entry: ResizeObserverEntry,
  box: DgResizeBox,
): readonly ResizeObserverSize[] | undefined {
  switch (box) {
    case 'border-box':
      return entry.borderBoxSize;
    case 'device-pixel-content-box':
      return entry.devicePixelContentBoxSize;
    case 'content-box':
    default:
      return entry.contentBoxSize;
  }
}

/**
 * Normalize `T | (() => T) | undefined` into a plain accessor.
 *
 * Signals are zero-argument functions, so passing a signal makes the resulting
 * option reactive with no extra ceremony.
 */
export function toAccessor<T>(
  value: T | (() => T) | undefined,
  fallback: T,
): () => T {
  if (value === undefined) {
    return () => fallback;
  }
  if (typeof value === 'function') {
    return value as () => T;
  }
  return () => value;
}

/** Compare two events by their measured dimensions (used for distinct mode). */
export function dimensionsEqual(a: DgResizeEvent, b: DgResizeEvent): boolean {
  return a.width === b.width && a.height === b.height;
}

/** Build the public {@link DgResizeEvent} from a raw entry. */
export function toResizeEvent(
  entry: ResizeObserverEntry,
  box: DgResizeBox,
  initial: boolean,
): DgResizeEvent {
  const { width, height } = readBoxSize(entry, box);
  return {
    target: entry.target,
    contentRect: entry.contentRect,
    entry,
    width,
    height,
    box,
    initial,
  };
}
