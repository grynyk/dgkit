import { isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  effect,
  inject,
  isDevMode,
  PLATFORM_ID,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounce, filter, of, Subject, tap, timer } from 'rxjs';

import type { DgResizeBox, DgResizeEvent } from './resize-observer.types';
import {
  dimensionsEqual,
  isResizeObserverSupported,
  pickEntry,
  toResizeEvent,
} from './resize-observer.utils';

/** Everything the observation engine needs, expressed as accessors. */
export interface ResizeObservationConfig {
  /** Resolves the element to observe. Read reactively. */
  readonly resolveTarget: () => Element | undefined;
  /** Observation box. Read reactively — changing it re-observes. */
  readonly box: () => DgResizeBox;
  /** Normalized debounce in ms. Read per emission. */
  readonly debounceMs: () => number;
  /** Whether to report the first measurement. Read per emission. */
  readonly emitInitial: () => boolean;
  /** Whether to drop consecutive equal sizes. Read per emission. */
  readonly distinct: () => boolean;
  /** Receives every measurement that survives debounce/distinct. */
  readonly sink: (event: DgResizeEvent) => void;
}

/** Handle returned by {@link createResizeObservation}. */
export interface ResizeObservationHandle {
  /** `false` under SSR or when the browser lacks `ResizeObserver`. */
  readonly supported: boolean;
}

/**
 * The single observation engine shared by `injectResizeObserver` and
 * `ResizeObserverDirective`.
 *
 * Must be called from an injection context. It is SSR-safe by construction:
 * on the server nothing is created and no browser global is touched. Target and
 * box are read inside an `effect`, so changing either transparently re-observes;
 * debounce and distinct are read per emission, so they react at runtime too.
 */
export function createResizeObservation(
  config: ResizeObservationConfig,
): ResizeObservationHandle {
  const destroyRef = inject(DestroyRef);
  const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  const supported = isBrowser && isResizeObserverSupported();

  if (isBrowser && !supported && isDevMode()) {
    console.warn(
      '[dgResizeObserver] ResizeObserver is not available in this ' +
        'environment; observation is inert. Consider a polyfill if you ' +
        'need support here.',
    );
  }

  const resized$ = new Subject<DgResizeEvent>();
  let lastEmitted: DgResizeEvent | undefined;

  resized$
    .pipe(
      // A synchronous notifier (`of(0)`) makes debounce a pass-through, so a
      // debounce of 0 emits in the same tick rather than deferring a timer.
      debounce(() => {
        const ms = config.debounceMs();
        return ms > 0 ? timer(ms) : of(0);
      }),
      filter(
        (event) =>
          !config.distinct() ||
          !lastEmitted ||
          !dimensionsEqual(lastEmitted, event),
      ),
      tap((event) => (lastEmitted = event)),
      takeUntilDestroyed(destroyRef),
    )
    .subscribe((event) => config.sink(event));

  let observer: ResizeObserver | undefined;
  let isFirstCallback = true;

  function handleEntries(
    entries: ResizeObserverEntry[],
    target: Element,
    box: DgResizeBox,
  ): void {
    const entry = pickEntry(entries, target);
    if (!entry) {
      return;
    }

    const initial = isFirstCallback;
    isFirstCallback = false;

    // The native observer always delivers one measurement on observe(); it is
    // suppressed unless the caller opted in.
    if (initial && !config.emitInitial()) {
      return;
    }

    resized$.next(toResizeEvent(entry, box, initial));
  }

  if (supported) {
    effect(() => {
      const target = config.resolveTarget();
      const box = config.box();

      // Any target/box change starts a fresh observation.
      observer?.disconnect();
      observer = undefined;
      isFirstCallback = true;

      if (!target) {
        return;
      }

      const next = new ResizeObserver((entries) =>
        handleEntries(entries, target, box),
      );
      try {
        next.observe(target, { box });
      } catch {
        // Some engines reject unsupported box options (notably
        // `device-pixel-content-box`). Fall back to default observation.
        next.observe(target);
      }
      observer = next;
    });
  }

  destroyRef.onDestroy(() => {
    // `disconnect()` is more robust than `unobserve()`: it drops every
    // observation and releases the callback in one call.
    observer?.disconnect();
    observer = undefined;
    resized$.complete();
  });

  return { supported };
}
