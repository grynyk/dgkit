import { describe, expect, it } from 'vitest';

import {
  DEFAULT_SERIALIZER,
  normalizeDebounce,
  resolveStorage,
} from './signal-storage.utils';

describe('DEFAULT_SERIALIZER', () => {
  it('round-trips plain values through JSON', () => {
    expect(
      DEFAULT_SERIALIZER.parse(DEFAULT_SERIALIZER.stringify({ a: 1 })),
    ).toEqual({
      a: 1,
    });
  });
});

describe('resolveStorage', () => {
  it('resolves localStorage by default', () => {
    expect(resolveStorage('local')).toBe(window.localStorage);
  });

  it('resolves sessionStorage when requested', () => {
    expect(resolveStorage('session')).toBe(window.sessionStorage);
  });

  it('returns undefined when accessing storage throws', () => {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get(): Storage {
        throw new Error('denied');
      },
    });
    try {
      expect(resolveStorage('local')).toBeUndefined();
    } finally {
      if (descriptor) {
        Object.defineProperty(window, 'localStorage', descriptor);
      }
    }
  });
});

describe('normalizeDebounce', () => {
  it('clamps invalid values to zero', () => {
    expect(normalizeDebounce(100)).toBe(100);
    expect(normalizeDebounce(0)).toBe(0);
    expect(normalizeDebounce(-1)).toBe(0);
    expect(normalizeDebounce(Number.NaN)).toBe(0);
    expect(normalizeDebounce(Number.POSITIVE_INFINITY)).toBe(0);
    expect(normalizeDebounce('250')).toBe(250);
    expect(normalizeDebounce('abc')).toBe(0);
    expect(normalizeDebounce(undefined)).toBe(0);
  });
});
