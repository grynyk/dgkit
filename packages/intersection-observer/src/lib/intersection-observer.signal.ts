import { computed, ElementRef, signal } from '@angular/core';

import { createIntersectionObservation } from './intersection-observer.core';
import type {
  DgIntersectEvent,
  DgIntersectionObserverOptions,
  DgIntersectionObserverRef,
  DgIntersectionTarget,
} from './intersection-observer.types';
import {
  normalizeRootMargin,
  normalizeThreshold,
  toAccessor,
} from './intersection-observer.utils';

function resolveElement(
  value: Element | ElementRef<Element> | undefined | null,
): Element | undefined {
  if (!value) {
    return undefined;
  }
  return value instanceof ElementRef ? value.nativeElement : value;
}

function toTargetAccessor(
  target: DgIntersectionTarget,
): () => Element | undefined {
  if (typeof target === 'function') {
    return () => resolveElement(target());
  }
  const resolved = resolveElement(target);
  return () => resolved;
}

/**
 * Observe an element's intersection with the viewport (or a root) and expose it
 * as signals.
 *
 * ```ts
 * const anchor = viewChild.required<ElementRef>('anchor');
 * const visibility = injectIntersectionObserver(anchor, { once: true });
 *
 * visibility.isIntersecting(); // boolean
 * visibility.ratio();          // 0–1
 * visibility.entry();          // IntersectionObserverEntry | undefined
 * ```
 *
 * Useful for lazy content, analytics, animations and infinite scrolling. The
 * native callback writes straight into a signal — no `NgZone`, no
 * `ChangeDetectorRef`. Must be called from an injection context; teardown is
 * automatic.
 */
export function injectIntersectionObserver(
  target: DgIntersectionTarget,
  options: DgIntersectionObserverOptions = {},
): DgIntersectionObserverRef {
  const event = signal<DgIntersectEvent | undefined>(undefined);

  const root = toAccessor(options.root, null);
  const rootMargin = toAccessor(options.rootMargin, '0px');
  const threshold = toAccessor<number | number[]>(options.threshold, 0);

  const { supported } = createIntersectionObservation({
    resolveTarget: toTargetAccessor(target),
    root: () => root(),
    rootMargin: () => normalizeRootMargin(rootMargin()),
    threshold: () => normalizeThreshold(threshold()),
    once: toAccessor(options.once, false),
    emitInitial: toAccessor(options.emitInitial, true),
    sink: (next) => event.set(next),
  });

  const isSupported = signal(supported);

  return {
    isIntersecting: computed(() => event()?.isIntersecting ?? false),
    ratio: computed(() => event()?.ratio ?? 0),
    entry: computed(() => event()?.entry),
    event: event.asReadonly(),
    isSupported: isSupported.asReadonly(),
  };
}
