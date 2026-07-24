import { ElementRef } from '@angular/core';

import type {
  DgMutationObserverInit,
  DgMutationTarget,
} from './mutation-observer.types';

/**
 * Feature-detect the native `MutationObserver`.
 *
 * Returns `false` under SSR (no `MutationObserver` on the server global) and
 * in test or legacy browser environments where the API is absent, allowing
 * observation to degrade gracefully instead of throwing.
 */
export function isMutationObserverSupported(): boolean {
  return (
    typeof MutationObserver !== 'undefined' &&
    typeof MutationObserver === 'function'
  );
}

/**
 * Normalize a debounce duration in milliseconds.
 *
 * Negative, `NaN` and non-finite values (e.g. `Infinity`) are treated as `0`,
 * which is interpreted as "emit synchronously, no debounce".
 */
export function normalizeDebounce(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

/**
 * Coerce an arbitrary init object into one the native observer will accept.
 *
 * `MutationObserver.observe` throws unless at least one of `childList`,
 * `attributes` or `characterData` is `true`. Rather than let that surface as
 * a runtime crash from a plain input typo, default to `{ childList: true }`
 * when none is set — the most common "something changed" use case.
 */
export function normalizeMutationInit(
  init: DgMutationObserverInit,
): DgMutationObserverInit {
  if (init.childList || init.attributes || init.characterData) {
    return init;
  }
  return { ...init, childList: true };
}

/** Resolve a `Node`, an `ElementRef`, or `null`/`undefined` to a node. */
export function resolveNode(
  value: Node | ElementRef<Element> | undefined | null,
): Node | undefined {
  if (!value) {
    return undefined;
  }
  return value instanceof ElementRef ? value.nativeElement : value;
}

/**
 * Normalize a {@link DgMutationTarget} into an accessor returning the node (or
 * `undefined`). A plain target is resolved once; a function target (e.g. a
 * `viewChild` signal) is resolved on every read, so it re-observes reactively.
 */
export function toTargetAccessor(
  target: DgMutationTarget,
): () => Node | undefined {
  if (typeof target === 'function') {
    return () => resolveNode(target());
  }
  const resolved = resolveNode(target);
  return () => resolved;
}

/**
 * Normalize `T | (() => T) | undefined` into a plain accessor.
 *
 * Signals are zero-argument functions, so passing a signal makes the
 * resulting option reactive with no extra ceremony.
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
