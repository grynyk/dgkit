import {
  booleanAttribute,
  Directive,
  ElementRef,
  inject,
  input,
  numberAttribute,
  output,
} from '@angular/core';

import { createResizeObservation } from './resize-observer.core';
import type { DgResizeBox, DgResizeEvent } from './resize-observer.types';
import { normalizeBox, normalizeDebounce } from './resize-observer.utils';

/**
 * Standalone, SSR-safe Angular directive around the native `ResizeObserver`.
 *
 * ```html
 * <div
 *   dgResizeObserver
 *   [resizeDebounce]="100"
 *   [resizeBox]="'border-box'"
 *   [resizeEmitInitial]="true"
 *   [resizeDistinct]="true"
 *   (dgResize)="onResize($event)"
 * ></div>
 * ```
 *
 * A thin wrapper over the same engine as `injectResizeObserver`; prefer the
 * signal API when you want the size as state rather than as an event stream.
 */
@Directive({
  selector: '[dgResizeObserver]',
  standalone: true,
})
export class ResizeObserverDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Debounce duration in milliseconds. `0` (default) emits synchronously with
   * no debounce. Negative, `NaN` and non-finite values are normalized to `0`.
   */
  readonly resizeDebounce = input(0, { transform: numberAttribute });

  /**
   * Observation box passed to `ResizeObserver.observe`. Invalid runtime values
   * fall back to `content-box`. Changing this at runtime re-observes the host.
   */
  readonly resizeBox = input<DgResizeBox>('content-box');

  /**
   * When `true`, the first measurement delivered right after observation starts
   * is emitted. When `false` (default) that initial measurement is suppressed
   * and only subsequent resizes emit.
   */
  readonly resizeEmitInitial = input(false, { transform: booleanAttribute });

  /**
   * When `true`, consecutive events with identical width and height are
   * suppressed. Box changes are not part of the comparison.
   */
  readonly resizeDistinct = input(false, { transform: booleanAttribute });

  /** Emits whenever the host element is resized (subject to the inputs above). */
  readonly dgResize = output<DgResizeEvent>();

  constructor() {
    createResizeObservation({
      resolveTarget: () => this.host.nativeElement,
      box: () => normalizeBox(this.resizeBox()),
      debounceMs: () => normalizeDebounce(this.resizeDebounce()),
      emitInitial: () => this.resizeEmitInitial(),
      distinct: () => this.resizeDistinct(),
      sink: (event) => this.dgResize.emit(event),
    });
  }
}
