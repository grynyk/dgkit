import {
  booleanAttribute,
  Directive,
  ElementRef,
  inject,
  input,
  numberAttribute,
  output,
} from '@angular/core';

import { createMutationObservation } from './mutation-observer.core';
import type { DgMutationEvent } from './mutation-observer.types';
import {
  normalizeDebounce,
  normalizeMutationInit,
} from './mutation-observer.utils';

/**
 * Standalone, SSR-safe Angular directive around the native `MutationObserver`.
 *
 * ```html
 * <div
 *   dgMutationObserver
 *   [mutationChildList]="true"
 *   [mutationSubtree]="true"
 *   [mutationDebounce]="100"
 *   (dgMutation)="onMutation($event)"
 * ></div>
 * ```
 *
 * A thin wrapper over the same engine as `injectMutationObserver`; prefer the
 * signal API when you want mutations as state rather than as an event stream.
 */
@Directive({
  selector: '[dgMutationObserver]',
  standalone: true,
})
export class MutationObserverDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Notify when child nodes are added or removed. Defaults to `true`. */
  readonly mutationChildList = input(true, { transform: booleanAttribute });

  /** Extend `childList`/`attributes`/`characterData` to descendants too. */
  readonly mutationSubtree = input(false, { transform: booleanAttribute });

  /** Notify on attribute changes. */
  readonly mutationAttributes = input(false, { transform: booleanAttribute });

  /** Restrict attribute observation to these attribute names. */
  readonly mutationAttributeFilter = input<readonly string[] | undefined>(
    undefined,
  );

  /** Record the attribute's previous value on each attribute mutation. */
  readonly mutationAttributeOldValue = input(false, {
    transform: booleanAttribute,
  });

  /** Notify on `CharacterData` (text node) changes. */
  readonly mutationCharacterData = input(false, {
    transform: booleanAttribute,
  });

  /** Record the character data's previous value on each mutation. */
  readonly mutationCharacterDataOldValue = input(false, {
    transform: booleanAttribute,
  });

  /**
   * Debounce duration in milliseconds. `0` (default) emits synchronously with
   * no debounce. Negative, `NaN` and non-finite values are normalized to `0`.
   * A positive value coalesces every mutation observed within the window into
   * a single event.
   */
  readonly mutationDebounce = input(0, { transform: numberAttribute });

  /** Emits whenever the host's observed mutations fire (subject to debounce). */
  readonly dgMutation = output<DgMutationEvent>();

  constructor() {
    createMutationObservation({
      resolveTarget: () => this.host.nativeElement,
      init: () =>
        normalizeMutationInit({
          childList: this.mutationChildList(),
          subtree: this.mutationSubtree(),
          attributes: this.mutationAttributes(),
          attributeFilter: this.mutationAttributeFilter()?.slice(),
          attributeOldValue: this.mutationAttributeOldValue(),
          characterData: this.mutationCharacterData(),
          characterDataOldValue: this.mutationCharacterDataOldValue(),
        }),
      debounceMs: () => normalizeDebounce(this.mutationDebounce()),
      sink: (event) => this.dgMutation.emit(event),
    });
  }
}
