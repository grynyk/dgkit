/**
 * Public API of `@dgkit/signal-storage`.
 *
 * A single signal function, `injectStorageSignal`, backed by `localStorage`
 * or `sessionStorage`. Implementation helpers under `./lib` stay private.
 */
export { injectStorageSignal } from './lib/signal-storage';
export type {
  DgStorageKind,
  DgStorageSerializer,
  DgStorageSignalOptions,
  DgStorageSignalRef,
} from './lib/signal-storage.types';
