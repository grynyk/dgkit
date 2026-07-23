import {
  booleanAttribute,
  Directive,
  ElementRef,
  inject,
  input,
  output,
} from '@angular/core';

import { createIntersectionObservation } from './intersection-observer.core';
import type { DgIntersectEvent } from './intersection-observer.types';
import {
  normalizeRootMargin,
  normalizeThreshold,
} from './intersection-observer.utils';

/**
 * Standalone, SSR-safe Angular directive around the native
 * `IntersectionObserver`.
 *
 * ```html
 * <img
 *   dgIntersectionObserver
 *   [intersectRootMargin]="'200px'"
 *   [intersectOnce]="true"
 *   (dgIntersect)="onIntersect($event)"
 * />
 * ```
 *
 * A thin wrapper over the same engine as `injectIntersectionObserver`; prefer
 * the signal API when you want visibility as state rather than as an event.
 */
@Directive({
  selector: '[dgIntersectionObserver]',
  standalone: true,
})
export class IntersectionObserverDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The root to intersect against. `null` (default) means the viewport. */
  readonly intersectRoot = input<Element | Document | null>(null);

  /** Margin around the root, CSS-like. Defaults to `'0px'`. */
  readonly intersectRootMargin = input('0px');

  /** One or more thresholds in `0`–`1`. Defaults to `0`. */
  readonly intersectThreshold = input<number | number[]>(0);

  /** Stop observing after the first time the host intersects. */
  readonly intersectOnce = input(false, { transform: booleanAttribute });

  /**
   * When `true`, the first callback delivered right after observation starts is
   * emitted. When `false` (default) that initial callback is suppressed.
   */
  readonly intersectEmitInitial = input(false, {
    transform: booleanAttribute,
  });

  /** Emits whenever the host's intersection with the root changes. */
  readonly dgIntersect = output<DgIntersectEvent>();

  constructor() {
    createIntersectionObservation({
      resolveTarget: () => this.host.nativeElement,
      root: () => this.intersectRoot(),
      rootMargin: () => normalizeRootMargin(this.intersectRootMargin()),
      threshold: () => normalizeThreshold(this.intersectThreshold()),
      once: () => this.intersectOnce(),
      emitInitial: () => this.intersectEmitInitial(),
      sink: (event) => this.dgIntersect.emit(event),
    });
  }
}
