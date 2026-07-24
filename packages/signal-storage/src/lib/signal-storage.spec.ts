import { PLATFORM_ID, type Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { injectStorageSignal } from './signal-storage';
import type {
  DgStorageSignalOptions,
  DgStorageSignalRef,
} from './signal-storage.types';

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const SERVER: Provider[] = [{ provide: PLATFORM_ID, useValue: 'server' }];

/** Temporarily capture `console.warn` output without a runner spy API. */
function captureWarnings(fn: () => void): string[] {
  const original = console.warn;
  const messages: string[] = [];
  console.warn = (...args: unknown[]): void => {
    messages.push(args.join(' '));
  };
  try {
    fn();
  } finally {
    console.warn = original;
  }
  return messages;
}

function make<T>(
  key: string,
  defaultValue: T,
  options: DgStorageSignalOptions<T> = {},
  providers: Provider[] = [],
): DgStorageSignalRef<T> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers });
  return TestBed.runInInjectionContext(() =>
    injectStorageSignal(key, defaultValue, options),
  );
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  TestBed.resetTestingModule();
});

describe('initial read', () => {
  it('defaults when nothing is stored', () => {
    const value = make('theme', 'light');
    expect(value()).toBe('light');
  });

  it('reads an existing stored value', () => {
    localStorage.setItem('theme', JSON.stringify('dark'));
    const value = make('theme', 'light');
    expect(value()).toBe('dark');
  });

  it('falls back to the default and warns on unparsable stored JSON', () => {
    localStorage.setItem('theme', '{not json');
    const messages = captureWarnings(() => {
      const value = make('theme', 'light');
      expect(value()).toBe('light');
    });
    expect(messages.length).toBe(1);
    expect(messages[0]).toContain('theme');
  });

  it('reads from sessionStorage when requested', () => {
    sessionStorage.setItem('draft', JSON.stringify('hello'));
    const value = make('draft', '', { storage: 'session' });
    expect(value()).toBe('hello');
    expect(localStorage.getItem('draft')).toBeNull();
  });
});

describe('writes', () => {
  it('set() updates the signal and persists synchronously by default', () => {
    const value = make('count', 0);
    value.set(5);
    expect(value()).toBe(5);
    expect(localStorage.getItem('count')).toBe('5');
  });

  it('update() derives from the current value', () => {
    const value = make('count', 1);
    value.update((n) => n + 1);
    expect(value()).toBe(2);
    expect(localStorage.getItem('count')).toBe('2');
  });

  it('remove() clears storage and resets to the default', () => {
    const value = make('count', 0);
    value.set(9);
    value.remove();
    expect(value()).toBe(0);
    expect(localStorage.getItem('count')).toBeNull();
  });

  it('warns but does not throw when a write fails (e.g. quota exceeded)', () => {
    // eslint-disable-next-line @typescript-eslint/unbound-method -- restored as-is below, never invoked detached from an instance
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = (): void => {
      throw new Error('QuotaExceededError');
    };
    try {
      const messages = captureWarnings(() => {
        const value = make('count', 0);
        expect(() => value.set(1)).not.toThrow();
        expect(value()).toBe(1); // in-memory state still updates
      });
      expect(messages.length).toBe(1);
    } finally {
      Storage.prototype.setItem = original;
    }
  });

  it('warns but does not throw when removeItem fails', () => {
    // eslint-disable-next-line @typescript-eslint/unbound-method -- restored as-is below, never invoked detached from an instance
    const original = Storage.prototype.removeItem;
    Storage.prototype.removeItem = (): void => {
      throw new Error('denied');
    };
    try {
      const messages = captureWarnings(() => {
        const value = make('count', 0);
        expect(() => value.remove()).not.toThrow();
      });
      expect(messages.length).toBe(1);
    } finally {
      Storage.prototype.removeItem = original;
    }
  });
});

describe('debounce', () => {
  it('writes synchronously when debounce is zero', () => {
    const value = make('count', 0, { debounce: 0 });
    value.set(1);
    expect(localStorage.getItem('count')).toBe('1');
  });

  it('delays writes when debounce is positive', async () => {
    const value = make('count', 0, { debounce: 30 });
    value.set(1);
    expect(localStorage.getItem('count')).toBeNull();
    await wait(60);
    expect(localStorage.getItem('count')).toBe('1');
  });

  it('coalesces rapid writes into the latest value', async () => {
    const value = make('count', 0, { debounce: 30 });
    value.set(1);
    value.set(2);
    value.set(3);
    await wait(60);
    expect(localStorage.getItem('count')).toBe('3');
  });

  it('flushes a pending debounced write on destroy', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const value = TestBed.runInInjectionContext(() =>
      injectStorageSignal('count', 0, { debounce: 500 }),
    );
    value.set(7);
    expect(localStorage.getItem('count')).toBeNull();
    TestBed.resetTestingModule(); // destroys the injection context
    expect(localStorage.getItem('count')).toBe('7');
  });

  it('normalizes an invalid debounce to zero (synchronous)', () => {
    const value = make('count', 0, { debounce: Number.NaN });
    value.set(1);
    expect(localStorage.getItem('count')).toBe('1');
  });
});

describe('cross-tab sync', () => {
  it('applies an update from another tab for the same key', () => {
    const value = make('theme', 'light');
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'theme',
        newValue: JSON.stringify('dark'),
        storageArea: localStorage,
      }),
    );
    expect(value()).toBe('dark');
  });

  it('resets to the default when the key is removed elsewhere', () => {
    const value = make('theme', 'light');
    value.set('dark');
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'theme',
        newValue: null,
        storageArea: localStorage,
      }),
    );
    expect(value()).toBe('light');
  });

  it('ignores events for a different key', () => {
    const value = make('theme', 'light');
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'other',
        newValue: JSON.stringify('dark'),
        storageArea: localStorage,
      }),
    );
    expect(value()).toBe('light');
  });

  it('ignores events for a different storage area', () => {
    const value = make('theme', 'light');
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'theme',
        newValue: JSON.stringify('dark'),
        storageArea: sessionStorage,
      }),
    );
    expect(value()).toBe('light');
  });

  it('warns and ignores an unparsable cross-tab update', () => {
    const value = make('theme', 'light');
    const messages = captureWarnings(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'theme',
          newValue: '{not json',
          storageArea: localStorage,
        }),
      );
    });
    expect(value()).toBe('light');
    expect(messages.length).toBe(1);
  });

  it('does not listen when syncTabs is disabled', () => {
    const value = make('theme', 'light', { syncTabs: false });
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'theme',
        newValue: JSON.stringify('dark'),
        storageArea: localStorage,
      }),
    );
    expect(value()).toBe('light');
  });

  it('stops listening after destroy', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const value = TestBed.runInInjectionContext(() =>
      injectStorageSignal('theme', 'light'),
    );
    TestBed.resetTestingModule();
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'theme',
        newValue: JSON.stringify('dark'),
        storageArea: localStorage,
      }),
    );
    expect(value()).toBe('light');
  });
});

describe('custom serializer', () => {
  it('round-trips a non-JSON-native type', () => {
    const value = make<Date>('when', new Date('2020-01-01T00:00:00.000Z'), {
      serializer: {
        parse: (raw) => new Date(raw),
        stringify: (v) => v.toISOString(),
      },
    });
    value.set(new Date('2021-06-15T00:00:00.000Z'));
    expect(localStorage.getItem('when')).toBe('2021-06-15T00:00:00.000Z');

    const reread = make<Date>('when', new Date(0), {
      serializer: {
        parse: (raw) => new Date(raw),
        stringify: (v) => v.toISOString(),
      },
    });
    expect(reread().toISOString()).toBe('2021-06-15T00:00:00.000Z');
  });
});

describe('equal option', () => {
  it('skips redundant updates when values compare equal', () => {
    const value = make(
      'point',
      { x: 0, y: 0 },
      {
        equal: (a, b) => a.x === b.x && a.y === b.y,
      },
    );
    const first = value();
    value.set({ x: 0, y: 0 });
    expect(value()).toBe(first);
  });
});

describe('SSR and unsupported environments', () => {
  it('is SSR-safe: in-memory only, isSupported false', () => {
    const value = make('theme', 'light', {}, SERVER);
    expect(value.isSupported()).toBe(false);
    value.set('dark');
    expect(value()).toBe('dark');
    expect(localStorage.getItem('theme')).toBeNull();
  });

  it('remove() is a safe no-op against storage when unsupported (SSR)', () => {
    const value = make('theme', 'light', {}, SERVER);
    expect(() => value.remove()).not.toThrow();
    expect(value()).toBe('light');
  });

  it('reports isSupported = true when storage is reachable', () => {
    const value = make('theme', 'light');
    expect(value.isSupported()).toBe(true);
  });

  it('degrades to in-memory state when storage access throws', () => {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get(): Storage {
        throw new Error('denied');
      },
    });
    try {
      const value = make('theme', 'light');
      expect(value.isSupported()).toBe(false);
      value.set('dark');
      expect(value()).toBe('dark');
    } finally {
      if (descriptor) {
        Object.defineProperty(window, 'localStorage', descriptor);
      }
    }
  });
});
