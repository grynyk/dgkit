import { isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  effect,
  inject,
  isDevMode,
  PLATFORM_ID,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounce, of, Subject, timer } from 'rxjs';

import type {
  DgMutationEvent,
  DgMutationObserverInit,
} from './mutation-observer.types';
import {
  isMutationObserverSupported,
  normalizeMutationInit,
} from './mutation-observer.utils';

/** Everything the observation engine needs, expressed as accessors. */
export interface MutationObservationConfig {
  /** Resolves the node to observe. Read reactively. */
  readonly resolveTarget: () => Node | undefined;
  /** Observation init. Read reactively — changing it re-observes. */
  readonly init: () => DgMutationObserverInit;
  /** Normalized debounce in ms. Read per emission. */
  readonly debounceMs: () => number;
  /** Receives every batch of records that survives debounce. */
  readonly sink: (event: DgMutationEvent) => void;
}

/** Handle returned by {@link createMutationObservation}. */
export interface MutationObservationHandle {
  /** `false` under SSR or when the browser lacks `MutationObserver`. */
  readonly supported: boolean;
}

/**
 * The single observation engine shared by `injectMutationObserver` and
 * `MutationObserverDirective`.
 *
 * Must be called from an injection context. It is SSR-safe by construction:
 * on the server nothing is created and no browser global is touched. Target
 * and init are read inside an `effect`, so changing either transparently
 * re-observes; debounce is read per emission, so it reacts at runtime too.
 */
export function createMutationObservation(
  config: MutationObservationConfig,
): MutationObservationHandle {
  const destroyRef = inject(DestroyRef);
  const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  const supported = isBrowser && isMutationObserverSupported();

  if (isBrowser && !supported && isDevMode()) {
    console.warn(
      '[dgMutationObserver] MutationObserver is not available in this ' +
        'environment; observation is inert.',
    );
  }

  const mutated$ = new Subject<void>();
  let buffered: MutationRecord[] = [];
  let currentTarget: Node | undefined;

  mutated$
    .pipe(
      // A synchronous notifier (`of(0)`) makes debounce a pass-through, so a
      // debounce of 0 emits in the same tick rather than deferring a timer.
      debounce(() => {
        const ms = config.debounceMs();
        return ms > 0 ? timer(ms) : of(0);
      }),
      takeUntilDestroyed(destroyRef),
    )
    .subscribe(() => {
      if (buffered.length === 0 || !currentTarget) {
        return;
      }
      const records = buffered;
      buffered = [];
      config.sink({ records, target: currentTarget });
    });

  let observer: MutationObserver | undefined;

  if (supported) {
    effect(() => {
      const target = config.resolveTarget();
      const init = normalizeMutationInit(config.init());

      // Any target/init change starts a fresh observation.
      observer?.disconnect();
      observer = undefined;
      buffered = [];
      currentTarget = target;

      if (!target) {
        return;
      }

      const next = new MutationObserver((entries) => {
        buffered.push(...entries);
        mutated$.next();
      });
      next.observe(target, init);
      observer = next;
    });
  }

  destroyRef.onDestroy(() => {
    observer?.disconnect();
    observer = undefined;
    mutated$.complete();
  });

  return { supported };
}
