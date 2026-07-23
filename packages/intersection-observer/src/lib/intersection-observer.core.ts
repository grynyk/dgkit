import { isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  effect,
  inject,
  isDevMode,
  PLATFORM_ID,
} from '@angular/core';

import type { DgIntersectEvent } from './intersection-observer.types';
import {
  isIntersectionObserverSupported,
  pickEntry,
  toIntersectEvent,
} from './intersection-observer.utils';

/** Everything the observation engine needs, expressed as accessors. */
export interface IntersectionObservationConfig {
  readonly resolveTarget: () => Element | undefined;
  readonly root: () => Element | Document | null;
  readonly rootMargin: () => string;
  readonly threshold: () => number | number[];
  readonly once: () => boolean;
  readonly emitInitial: () => boolean;
  readonly sink: (event: DgIntersectEvent) => void;
}

/** Handle returned by {@link createIntersectionObservation}. */
export interface IntersectionObservationHandle {
  readonly supported: boolean;
}

/**
 * The single observation engine shared by `injectIntersectionObserver` and
 * `IntersectionObserverDirective`.
 *
 * Must be called from an injection context. SSR-safe by construction: on the
 * server nothing is created and no browser global is touched. Because
 * `IntersectionObserver` options are fixed at construction, any change to
 * target/root/rootMargin/threshold recreates the observer inside an `effect`.
 */
export function createIntersectionObservation(
  config: IntersectionObservationConfig,
): IntersectionObservationHandle {
  const destroyRef = inject(DestroyRef);
  const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  const supported = isBrowser && isIntersectionObserverSupported();

  if (isBrowser && !supported && isDevMode()) {
    console.warn(
      '[dgIntersectionObserver] IntersectionObserver is not available in ' +
        'this environment; observation is inert. Consider a polyfill if you ' +
        'need support here.',
    );
  }

  let observer: IntersectionObserver | undefined;
  let isFirstCallback = true;
  let destroyed = false;

  function handleEntries(
    entries: IntersectionObserverEntry[],
    target: Element,
  ): void {
    // A callback can still be in flight when the host is torn down; never emit
    // into a destroyed consumer.
    if (destroyed) {
      return;
    }

    const entry = pickEntry(entries, target);
    if (!entry) {
      return;
    }

    const initial = isFirstCallback;
    isFirstCallback = false;

    // Stop observing once the target has intersected, when `once` is set.
    if (entry.isIntersecting && config.once()) {
      observer?.disconnect();
      observer = undefined;
    }

    // The native observer always delivers one callback on observe(); it is
    // suppressed unless the caller opted in.
    if (initial && !config.emitInitial()) {
      return;
    }

    config.sink(toIntersectEvent(entry));
  }

  if (supported) {
    effect(() => {
      const target = config.resolveTarget();
      const root = config.root();
      const rootMargin = config.rootMargin();
      const threshold = config.threshold();

      observer?.disconnect();
      observer = undefined;
      isFirstCallback = true;

      if (!target) {
        return;
      }

      const next = new IntersectionObserver(
        (entries) => handleEntries(entries, target),
        { root, rootMargin, threshold },
      );
      next.observe(target);
      observer = next;
    });
  }

  destroyRef.onDestroy(() => {
    destroyed = true;
    observer?.disconnect();
    observer = undefined;
  });

  return { supported };
}
