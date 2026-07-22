import { isPlatformBrowser } from '@angular/common';
import {
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  isDevMode,
  numberAttribute,
  type OnInit,
  output,
  PLATFORM_ID,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounce, filter, of, Subject, tap, timer } from 'rxjs';

import type { DgResizeBox, DgResizeEvent } from './resize-observer.types';
import {
  dimensionsEqual,
  isResizeObserverSupported,
  normalizeBox,
  normalizeDebounce,
  pickEntry,
  toResizeEvent,
} from './resize-observer.utils';

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
 * ## Design notes
 * - The observer is created in {@link ngOnInit} (never in a field initializer)
 *   and only in the browser, so importing/using the directive is safe during
 *   server-side rendering. See requirements around SSR safety.
 * - Configuration inputs are signals. `resizeBox` re-observes reactively via an
 *   {@link effect}; `resizeDebounce` and `resizeDistinct` are read per-emission
 *   inside the RxJS pipeline, so changing them at runtime behaves predictably.
 * - Teardown calls `disconnect()` (more robust than `unobserve()`), completes
 *   the internal stream and relies on `takeUntilDestroyed` to drop the
 *   subscription, so there are no leaks.
 */
@Directive({
  selector: '[dgResizeObserver]',
  standalone: true,
})
export class ResizeObserverDirective implements OnInit {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

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

  private readonly normalizedDebounce = computed(() =>
    normalizeDebounce(this.resizeDebounce()),
  );
  private readonly normalizedBox = computed(() =>
    normalizeBox(this.resizeBox()),
  );

  private readonly resized$ = new Subject<DgResizeEvent>();

  private observer?: ResizeObserver;
  private isFirstCallback = true;
  private lastEmitted?: DgResizeEvent;
  private observedBox?: DgResizeBox;

  constructor() {
    // Re-observe reactively when the box option changes at runtime. The first
    // flush runs before ngOnInit (observer still undefined) and is skipped; the
    // `observedBox` guard also prevents a redundant re-observe on the initial
    // value set up by ngOnInit.
    effect(() => {
      const box = this.normalizedBox();
      if (this.observer && box !== this.observedBox) {
        this.reobserve(box);
      }
    });

    // The pipeline is set up eagerly; it only produces values once the observer
    // (created in ngOnInit) starts pushing into `resized$`.
    this.resized$
      .pipe(
        debounce(() => {
          const ms = this.normalizedDebounce();
          return ms > 0 ? timer(ms) : of(0);
        }),
        filter((event) => {
          if (!this.resizeDistinct()) {
            return true;
          }
          return !this.lastEmitted || !dimensionsEqual(this.lastEmitted, event);
        }),
        tap((event) => (this.lastEmitted = event)),
        takeUntilDestroyed(),
      )
      .subscribe((event) => this.dgResize.emit(event));

    this.destroyRef.onDestroy(() => this.teardown());
  }

  ngOnInit(): void {
    // SSR: never touch browser globals on the server.
    if (!this.isBrowser) {
      return;
    }

    // Graceful degradation when the API is missing (old browsers, some test
    // environments). The directive stays inert instead of throwing.
    if (!isResizeObserverSupported()) {
      if (isDevMode()) {
        console.warn(
          '[dgResizeObserver] ResizeObserver is not available in this ' +
            'environment; the directive is inert. Consider a polyfill if you ' +
            'need support here.',
        );
      }
      return;
    }

    this.observer = new ResizeObserver((entries) =>
      this.handleEntries(entries),
    );
    this.observeHost(this.normalizedBox());
  }

  /** Native callback handler — maps entries to events and feeds the pipeline. */
  private handleEntries(entries: ResizeObserverEntry[]): void {
    const entry = pickEntry(entries, this.host.nativeElement);
    if (!entry) {
      return;
    }

    const initial = this.isFirstCallback;
    this.isFirstCallback = false;

    // Suppress the observer's automatic first measurement unless opted in.
    if (initial && !this.resizeEmitInitial()) {
      return;
    }

    this.resized$.next(toResizeEvent(entry, this.normalizedBox(), initial));
  }

  private observeHost(box: DgResizeBox): void {
    const element = this.host.nativeElement;
    try {
      this.observer?.observe(element, { box });
    } catch {
      // Some engines reject unsupported box options (notably
      // `device-pixel-content-box`). Fall back to default observation so the
      // directive keeps emitting content-box measurements.
      this.observer?.observe(element);
    }
    this.observedBox = box;
  }

  private reobserve(box: DgResizeBox): void {
    this.observer?.unobserve(this.host.nativeElement);
    this.observeHost(box);
  }

  private teardown(): void {
    // `disconnect()` is more robust than `unobserve()` during destruction: it
    // drops every observation and releases the callback in one call, even if
    // the element was swapped out from under us.
    this.observer?.disconnect();
    this.observer = undefined;
    this.resized$.complete();
  }
}
