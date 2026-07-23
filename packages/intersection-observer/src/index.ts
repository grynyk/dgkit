/**
 * Public API of `@dgkit/intersection-observer`.
 *
 * A signal API (`injectIntersectionObserver`) and a directive
 * (`IntersectionObserverDirective`), both built on the same engine.
 */
export { injectIntersectionObserver } from './lib/intersection-observer.signal';
export { IntersectionObserverDirective } from './lib/intersection-observer.directive';
export type {
  DgIntersectEvent,
  DgIntersectionObserverOptions,
  DgIntersectionObserverRef,
  DgIntersectionTarget,
  DgValueOrAccessor,
} from './lib/intersection-observer.types';
