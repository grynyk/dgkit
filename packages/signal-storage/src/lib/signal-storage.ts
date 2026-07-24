import { isPlatformBrowser } from '@angular/common';
import {
  computed,
  DestroyRef,
  inject,
  isDevMode,
  PLATFORM_ID,
  signal,
  type CreateSignalOptions,
  type Signal,
} from '@angular/core';

import type {
  DgStorageSerializer,
  DgStorageSignalOptions,
  DgStorageSignalRef,
} from './signal-storage.types';
import {
  DEFAULT_SERIALIZER,
  normalizeDebounce,
  resolveStorage,
} from './signal-storage.utils';

/**
 * Type-safe, bidirectional synchronization between an Angular signal and
 * `localStorage`/`sessionStorage`.
 *
 * ```ts
 * const theme = injectStorageSignal('theme', 'light');
 *
 * theme();                 // read — 'light' | whatever was stored
 * theme.set('dark');       // write — updates the signal and persists
 * theme.update((t) => t === 'light' ? 'dark' : 'light');
 * theme.remove();          // clear storage, revert to the default
 * ```
 *
 * SSR-safe: on the server (or when storage is unreachable) the signal behaves
 * as in-memory-only state seeded with `defaultValue` — `isSupported()` is
 * `false` and writes never throw. By default, changes to the same key made in
 * another tab or window are reflected here too, via the native `storage`
 * event (same-tab writes never trigger that event, so there is no echo loop).
 *
 * Must be called from an injection context. Any pending debounced write is
 * flushed on destroy.
 */
export function injectStorageSignal<T>(
  key: string,
  defaultValue: T,
  options: DgStorageSignalOptions<T> = {},
): DgStorageSignalRef<T> {
  const {
    storage: storageKind = 'local',
    serializer = DEFAULT_SERIALIZER as DgStorageSerializer<T>,
    syncTabs = true,
    equal,
  } = options;
  const debounceMs = normalizeDebounce(options.debounce);

  const destroyRef = inject(DestroyRef);
  const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  const storage = isBrowser ? resolveStorage(storageKind) : undefined;

  function warn(message: string, cause: unknown): void {
    if (isDevMode()) {
      console.warn(`[injectStorageSignal] ${message}`, cause);
    }
  }

  function readInitial(): T {
    if (!storage) {
      return defaultValue;
    }
    const raw = storage.getItem(key);
    if (raw === null) {
      return defaultValue;
    }
    try {
      return serializer.parse(raw);
    } catch (cause) {
      warn(`Ignoring an unparsable stored value for "${key}".`, cause);
      return defaultValue;
    }
  }

  const signalOptions: CreateSignalOptions<T> | undefined = equal
    ? { equal }
    : undefined;
  const value = signal<T>(readInitial(), signalOptions);
  const isSupported = signal(!!storage);

  let writeTimer: ReturnType<typeof setTimeout> | undefined;

  // Only ever called once `storage` is known to exist — see `scheduleWrite`
  // and the destroy-time flush below.
  function persist(next: T): void {
    try {
      storage?.setItem(key, serializer.stringify(next));
    } catch (cause) {
      warn(`Failed to write "${key}" to storage.`, cause);
    }
  }

  function clearPendingWrite(): void {
    if (writeTimer !== undefined) {
      clearTimeout(writeTimer);
      writeTimer = undefined;
    }
  }

  function scheduleWrite(next: T): void {
    if (!storage) {
      return;
    }
    if (debounceMs <= 0) {
      persist(next);
      return;
    }
    clearPendingWrite();
    writeTimer = setTimeout(() => {
      writeTimer = undefined;
      persist(next);
    }, debounceMs);
  }

  function set(next: T): void {
    value.set(next);
    scheduleWrite(next);
  }

  function update(updater: (current: T) => T): void {
    set(updater(value()));
  }

  function remove(): void {
    clearPendingWrite();
    value.set(defaultValue);
    if (!storage) {
      return;
    }
    try {
      storage.removeItem(key);
    } catch (cause) {
      warn(`Failed to remove "${key}" from storage.`, cause);
    }
  }

  if (storage && syncTabs) {
    const onStorage = (event: StorageEvent): void => {
      if (event.storageArea !== storage || event.key !== key) {
        return;
      }
      if (event.newValue === null) {
        value.set(defaultValue);
        return;
      }
      try {
        value.set(serializer.parse(event.newValue));
      } catch (cause) {
        warn(`Ignoring an unparsable cross-tab update for "${key}".`, cause);
      }
    };
    window.addEventListener('storage', onStorage);
    destroyRef.onDestroy(() =>
      window.removeEventListener('storage', onStorage),
    );
  }

  destroyRef.onDestroy(() => {
    if (writeTimer !== undefined) {
      // A debounced write in flight at teardown must not be silently lost.
      clearTimeout(writeTimer);
      writeTimer = undefined;
      persist(value());
    }
  });

  const read = computed(() => value());
  const ref = read as DgStorageSignalRef<T>;
  ref.set = set;
  ref.update = update;
  ref.remove = remove;
  (ref as { isSupported: Signal<boolean> }).isSupported =
    isSupported.asReadonly();
  return ref;
}
