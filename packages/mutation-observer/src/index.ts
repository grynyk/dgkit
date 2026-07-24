/**
 * Public API of `@dgkit/mutation-observer`.
 *
 * A signal API (`injectMutationObserver`) and a directive
 * (`MutationObserverDirective`), both built on the same observation engine.
 * Implementation helpers under `./lib` stay private.
 */
export { injectMutationObserver } from './lib/mutation-observer.signal';
export { MutationObserverDirective } from './lib/mutation-observer.directive';
export type {
  DgMutationEvent,
  DgMutationObserverInit,
  DgMutationObserverOptions,
  DgMutationObserverRef,
  DgMutationTarget,
  DgValueOrAccessor,
} from './lib/mutation-observer.types';
