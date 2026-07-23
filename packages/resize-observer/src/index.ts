/**
 * Public API of `@dgkit/resize-observer`.
 *
 * A signal API (`injectResizeObserver`) and a directive
 * (`ResizeObserverDirective`), both built on the same observation engine.
 * Implementation helpers under `./lib` stay private.
 */
export { injectResizeObserver } from './lib/resize-observer.signal';
export { ResizeObserverDirective } from './lib/resize-observer.directive';
export type {
  DgResizeBox,
  DgResizeEvent,
  DgResizeObserverOptions,
  DgResizeObserverRef,
  DgResizeTarget,
  DgValueOrAccessor,
} from './lib/resize-observer.types';
