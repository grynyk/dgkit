import { computed, signal } from '@angular/core';

import { createMutationObservation } from './mutation-observer.core';
import type {
  DgMutationEvent,
  DgMutationObserverOptions,
  DgMutationObserverRef,
  DgMutationTarget,
} from './mutation-observer.types';
import {
  normalizeDebounce,
  toAccessor,
  toTargetAccessor,
} from './mutation-observer.utils';

/**
 * Observe a node's DOM mutations and expose them as signals.
 *
 * ```ts
 * const box = viewChild.required<ElementRef<HTMLElement>>('box');
 * const mutations = injectMutationObserver(box, { init: { childList: true, subtree: true } });
 *
 * mutations.records();      // MutationRecord[] | undefined
 * mutations.event();        // DgMutationEvent | undefined
 * mutations.isSupported();  // boolean
 * ```
 *
 * The native observer callback writes straight into a signal — no `NgZone`,
 * no `ChangeDetectorRef`, and no assumption that zone.js is loaded. Must be
 * called from an injection context; teardown is automatic.
 */
export function injectMutationObserver(
  target: DgMutationTarget,
  options: DgMutationObserverOptions = {},
): DgMutationObserverRef {
  const event = signal<DgMutationEvent | undefined>(undefined);

  const init = toAccessor(options.init, { childList: true });
  const debounceMs = toAccessor(options.debounce, 0);

  const { supported } = createMutationObservation({
    resolveTarget: toTargetAccessor(target),
    init,
    debounceMs: () => normalizeDebounce(debounceMs()),
    sink: (next) => event.set(next),
  });

  const isSupported = signal(supported);

  return {
    records: computed(() => event()?.records),
    event: event.asReadonly(),
    isSupported: isSupported.asReadonly(),
  };
}
