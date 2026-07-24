import { describe, expect, it } from 'vitest';

import { ElementRef } from '@angular/core';

import {
  isIntersectionObserverSupported,
  normalizeRootMargin,
  normalizeThreshold,
  pickEntry,
  resolveElement,
  toAccessor,
  toIntersectEvent,
  toTargetAccessor,
} from './intersection-observer.utils';
import {
  installMockIntersectionObserver,
  makeIntersectionEntry,
  removeIntersectionObserver,
} from './testing/mock-intersection-observer';

describe('normalizeRootMargin', () => {
  it('keeps non-empty strings and defaults otherwise', () => {
    expect(normalizeRootMargin('200px')).toBe('200px');
    expect(normalizeRootMargin('10px 20px')).toBe('10px 20px');
    expect(normalizeRootMargin('')).toBe('0px');
    expect(normalizeRootMargin('   ')).toBe('0px');
    expect(normalizeRootMargin(undefined)).toBe('0px');
    expect(normalizeRootMargin(42)).toBe('0px');
  });
});

describe('normalizeThreshold', () => {
  it('clamps single numbers to [0,1]', () => {
    expect(normalizeThreshold(0.5)).toBe(0.5);
    expect(normalizeThreshold(-1)).toBe(0);
    expect(normalizeThreshold(2)).toBe(1);
    expect(normalizeThreshold(Number.NaN)).toBe(0);
    expect(normalizeThreshold('x')).toBe(0);
    expect(normalizeThreshold(undefined)).toBe(0);
  });

  it('cleans and clamps arrays', () => {
    expect(normalizeThreshold([0, 0.5, 1])).toEqual([0, 0.5, 1]);
    expect(normalizeThreshold([-1, 2])).toEqual([0, 1]);
    expect(normalizeThreshold([Number.NaN, 'x' as unknown as number])).toBe(0);
    expect(normalizeThreshold([])).toBe(0);
  });
});

describe('toAccessor', () => {
  it('wraps values, passes functions, and falls back', () => {
    expect(toAccessor(5, 0)()).toBe(5);
    expect(toAccessor(undefined, 'd')()).toBe('d');
    let v = 1;
    const a = toAccessor(() => v, 0);
    v = 2;
    expect(a()).toBe(2);
  });
});

describe('isIntersectionObserverSupported', () => {
  it('reflects the environment', () => {
    const restore = installMockIntersectionObserver();
    try {
      expect(isIntersectionObserverSupported()).toBe(true);
    } finally {
      restore();
    }
    const removeIo = removeIntersectionObserver();
    try {
      expect(isIntersectionObserverSupported()).toBe(false);
    } finally {
      removeIo();
    }
  });
});

describe('pickEntry', () => {
  it('prefers the matching target and falls back to the last', () => {
    const a = document.createElement('div');
    const b = document.createElement('div');
    const ea = makeIntersectionEntry({ target: a });
    const eb = makeIntersectionEntry({ target: b });
    expect(pickEntry([ea, eb], a)).toBe(ea);
    expect(pickEntry([ea, eb], document.createElement('p'))).toBe(eb);
    expect(pickEntry([], a)).toBeUndefined();
  });
});

describe('resolveElement / toTargetAccessor', () => {
  it('resolveElement handles Element, ElementRef and nullish', () => {
    const el = document.createElement('div');
    expect(resolveElement(el)).toBe(el);
    expect(resolveElement(new ElementRef(el))).toBe(el);
    expect(resolveElement(null)).toBeUndefined();
    expect(resolveElement(undefined)).toBeUndefined();
  });

  it('toTargetAccessor resolves plain vs function targets', () => {
    const a = document.createElement('div');
    expect(toTargetAccessor(a)()).toBe(a);

    let current: HTMLElement | undefined = a;
    const accessor = toTargetAccessor(() => current);
    expect(accessor()).toBe(a);
    current = undefined;
    expect(accessor()).toBeUndefined();
  });
});

describe('toIntersectEvent', () => {
  it('maps entry fields onto the public event', () => {
    const el = document.createElement('div');
    const entry = makeIntersectionEntry({
      target: el,
      isIntersecting: true,
      intersectionRatio: 0.42,
    });
    const event = toIntersectEvent(entry);
    expect(event.target).toBe(el);
    expect(event.entry).toBe(entry);
    expect(event.isIntersecting).toBe(true);
    expect(event.ratio).toBe(0.42);
    expect(event.time).toBe(0);
  });
});
