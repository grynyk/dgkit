import { ElementRef } from '@angular/core';
import { describe, expect, it } from 'vitest';

import {
  isMutationObserverSupported,
  normalizeDebounce,
  normalizeMutationInit,
  resolveNode,
  toAccessor,
  toTargetAccessor,
} from './mutation-observer.utils';
import {
  installMockMutationObserver,
  removeMutationObserver,
} from './testing/mock-mutation-observer';

describe('normalizeMutationInit', () => {
  it('passes through an init that already sets a valid flag', () => {
    expect(normalizeMutationInit({ childList: true })).toEqual({
      childList: true,
    });
    expect(normalizeMutationInit({ attributes: true })).toEqual({
      attributes: true,
    });
    expect(normalizeMutationInit({ characterData: true })).toEqual({
      characterData: true,
    });
  });

  it('defaults to childList when nothing is set', () => {
    expect(normalizeMutationInit({})).toEqual({ childList: true });
    expect(normalizeMutationInit({ subtree: true })).toEqual({
      subtree: true,
      childList: true,
    });
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

describe('toAccessor', () => {
  it('wraps plain values', () => {
    expect(toAccessor(5, 0)()).toBe(5);
    expect(toAccessor(false, true)()).toBe(false);
  });

  it('falls back when undefined', () => {
    expect(toAccessor(undefined, 'fallback')()).toBe('fallback');
  });

  it('passes functions (and therefore signals) through', () => {
    let value = 1;
    const accessor = toAccessor(() => value, 0);
    expect(accessor()).toBe(1);
    value = 2;
    expect(accessor()).toBe(2);
  });
});

describe('isMutationObserverSupported', () => {
  it('reflects the environment', () => {
    const restore = installMockMutationObserver();
    try {
      expect(isMutationObserverSupported()).toBe(true);
    } finally {
      restore();
    }

    const remove = removeMutationObserver();
    try {
      expect(isMutationObserverSupported()).toBe(false);
    } finally {
      remove();
    }
  });
});

describe('resolveNode / toTargetAccessor', () => {
  it('resolveNode handles Node, ElementRef and nullish', () => {
    const el = document.createElement('div');
    expect(resolveNode(el)).toBe(el);
    expect(resolveNode(new ElementRef(el))).toBe(el);
    expect(resolveNode(null)).toBeUndefined();
    expect(resolveNode(undefined)).toBeUndefined();
  });

  it('toTargetAccessor resolves a plain target once', () => {
    const el = document.createElement('div');
    const accessor = toTargetAccessor(new ElementRef(el));
    expect(accessor()).toBe(el);
    expect(accessor()).toBe(el);
  });

  it('toTargetAccessor re-resolves a function target on every read', () => {
    let current: HTMLElement | undefined = document.createElement('div');
    const accessor = toTargetAccessor(() => current);
    expect(accessor()).toBe(current);
    current = document.createElement('span');
    expect(accessor()).toBe(current);
    current = undefined;
    expect(accessor()).toBeUndefined();
  });
});
