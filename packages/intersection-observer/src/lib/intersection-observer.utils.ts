import type { DgIntersectEvent } from './intersection-observer.types';

/**
 * Feature-detect the native `IntersectionObserver`. Returns `false` under SSR
 * and in environments without support.
 */
export function isIntersectionObserverSupported(): boolean {
  return (
    typeof IntersectionObserver !== 'undefined' &&
    typeof IntersectionObserver === 'function'
  );
}

/** Coerce a runtime rootMargin into a non-empty string, defaulting to `0px`. */
export function normalizeRootMargin(value: unknown): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : '0px';
}

/**
 * Coerce a runtime threshold into a valid number or number[] clamped to
 * `[0, 1]`. Invalid values fall back to `0`.
 */
export function normalizeThreshold(value: unknown): number | number[] {
  if (Array.isArray(value)) {
    const cleaned = value
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
      .map((v) => Math.min(1, Math.max(0, v)));
    return cleaned.length > 0 ? cleaned : 0;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.min(1, Math.max(0, value));
  }
  return 0;
}

/**
 * Select the entry that corresponds to `target` from a callback batch, falling
 * back to the most recent entry so a change is never silently dropped.
 */
export function pickEntry(
  entries: readonly IntersectionObserverEntry[],
  target: Element,
): IntersectionObserverEntry | undefined {
  if (entries.length === 0) {
    return undefined;
  }
  return (
    entries.find((entry) => entry.target === target) ??
    entries[entries.length - 1]
  );
}

/** Build the public {@link DgIntersectEvent} from a raw entry. */
export function toIntersectEvent(
  entry: IntersectionObserverEntry,
): DgIntersectEvent {
  return {
    target: entry.target,
    entry,
    isIntersecting: entry.isIntersecting,
    ratio: entry.intersectionRatio,
    boundingClientRect: entry.boundingClientRect,
    intersectionRect: entry.intersectionRect,
    rootBounds: entry.rootBounds,
    time: entry.time,
  };
}

/**
 * Normalize `T | (() => T) | undefined` into a plain accessor. Signals are
 * zero-argument functions, so passing one makes the option reactive.
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
