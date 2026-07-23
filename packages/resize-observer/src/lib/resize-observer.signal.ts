import { computed, ElementRef, signal } from '@angular/core';

import { createResizeObservation } from './resize-observer.core';
import type {
  DgResizeEvent,
  DgResizeObserverOptions,
  DgResizeObserverRef,
  DgResizeTarget,
} from './resize-observer.types';
import {
  normalizeBox,
  normalizeDebounce,
  toAccessor,
} from './resize-observer.utils';

function resolveElement(
  value: Element | ElementRef<Element> | undefined | null,
): Element | undefined {
  if (!value) {
    return undefined;
  }
  return value instanceof ElementRef ? value.nativeElement : value;
}

function toTargetAccessor(target: DgResizeTarget): () => Element | undefined {
  if (typeof target === 'function') {
    return () => resolveElement(target());
  }
  const resolved = resolveElement(target);
  return () => resolved;
}

/**
 * Observe an element's size and expose it as signals.
 *
 * ```ts
 * const box = viewChild.required<ElementRef<HTMLElement>>('box');
 * const size = injectResizeObserver(box);
 *
 * size.width();        // number
 * size.height();       // number
 * size.entry();        // ResizeObserverEntry | undefined
 * size.isSupported();  // boolean
 * ```
 *
 * The native observer callback writes straight into a signal — no `NgZone`, no
 * `ChangeDetectorRef`, and no assumption that zone.js is loaded. Must be called
 * from an injection context; teardown is automatic.
 *
 * Unlike the directive, this API defaults `emitInitial` and `distinct` to
 * `true`: a size signal should hold the current size immediately and should not
 * churn on identical measurements.
 */
export function injectResizeObserver(
  target: DgResizeTarget,
  options: DgResizeObserverOptions = {},
): DgResizeObserverRef {
  const event = signal<DgResizeEvent | undefined>(undefined);

  const box = toAccessor(options.box, 'content-box');
  const debounceMs = toAccessor(options.debounce, 0);

  const { supported } = createResizeObservation({
    resolveTarget: toTargetAccessor(target),
    box: () => normalizeBox(box()),
    debounceMs: () => normalizeDebounce(debounceMs()),
    emitInitial: toAccessor(options.emitInitial, true),
    distinct: toAccessor(options.distinct, true),
    sink: (next) => event.set(next),
  });

  const isSupported = signal(supported);

  return {
    width: computed(() => event()?.width ?? 0),
    height: computed(() => event()?.height ?? 0),
    entry: computed(() => event()?.entry),
    event: event.asReadonly(),
    isSupported: isSupported.asReadonly(),
  };
}
