/**
 * Public API of `@dgkit/resize-observer`.
 *
 * Everything a consumer needs and nothing more — the directive, its event type
 * and the box union. Implementation helpers under `./lib` stay private.
 */
export { ResizeObserverDirective } from './lib/resize-observer.directive';
export type { DgResizeEvent, DgResizeBox } from './lib/resize-observer.types';
