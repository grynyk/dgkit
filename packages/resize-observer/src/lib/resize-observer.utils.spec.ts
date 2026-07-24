import { describe, expect, it } from 'vitest';

import { ElementRef } from '@angular/core';

import {
  DG_DEFAULT_RESIZE_BOX,
  dimensionsEqual,
  isResizeObserverSupported,
  normalizeBox,
  normalizeDebounce,
  pickEntry,
  readBoxSize,
  resolveElement,
  toAccessor,
  toResizeEvent,
  toTargetAccessor,
} from './resize-observer.utils';
import {
  installMockResizeObserver,
  makeEntry,
  removeResizeObserver,
} from './testing/mock-resize-observer';

describe('normalizeBox', () => {
  it('accepts valid boxes and rejects everything else', () => {
    expect(normalizeBox('border-box')).toBe('border-box');
    expect(normalizeBox('device-pixel-content-box')).toBe(
      'device-pixel-content-box',
    );
    expect(normalizeBox('content-box')).toBe('content-box');
    expect(normalizeBox('bogus')).toBe(DG_DEFAULT_RESIZE_BOX);
    expect(normalizeBox(undefined)).toBe(DG_DEFAULT_RESIZE_BOX);
    expect(normalizeBox(null)).toBe(DG_DEFAULT_RESIZE_BOX);
    expect(normalizeBox(42)).toBe(DG_DEFAULT_RESIZE_BOX);
  });
});

describe('normalizeDebounce', () => {
  it('clamps invalid values to zero', () => {
    expect(normalizeDebounce(100)).toBe(100);
    expect(normalizeDebounce(0)).toBe(0);
    expect(normalizeDebounce(-1)).toBe(0);
    expect(normalizeDebounce(Number.NaN)).toBe(0);
    expect(normalizeDebounce(Number.POSITIVE_INFINITY)).toBe(0);
    expect(normalizeDebounce(Number.NEGATIVE_INFINITY)).toBe(0);
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

describe('isResizeObserverSupported', () => {
  it('reflects the environment', () => {
    const restore = installMockResizeObserver();
    try {
      expect(isResizeObserverSupported()).toBe(true);
    } finally {
      restore();
    }

    const removeRo = removeResizeObserver();
    try {
      expect(isResizeObserverSupported()).toBe(false);
    } finally {
      removeRo();
    }
  });
});

describe('pickEntry', () => {
  it('prefers the matching target and falls back sensibly', () => {
    const a = document.createElement('div');
    const b = document.createElement('div');
    const entryA = makeEntry({ target: a, width: 1, height: 1 });
    const entryB = makeEntry({ target: b, width: 2, height: 2 });
    expect(pickEntry([entryA, entryB], b)).toBe(entryB);
    expect(pickEntry([entryA, entryB], a)).toBe(entryA);
    // No match → most recent entry rather than dropping the measurement.
    expect(pickEntry([entryA, entryB], document.createElement('p'))).toBe(
      entryB,
    );
    expect(pickEntry([], a)).toBeUndefined();
  });
});

describe('readBoxSize', () => {
  it('reads the requested box', () => {
    const el = document.createElement('div');
    const entry = makeEntry({ target: el, width: 30, height: 40 });
    expect(readBoxSize(entry, 'content-box')).toEqual({
      width: 30,
      height: 40,
    });
    expect(readBoxSize(entry, 'border-box')).toEqual({ width: 30, height: 40 });
    expect(readBoxSize(entry, 'device-pixel-content-box')).toEqual({
      width: 30,
      height: 40,
    });
  });

  it('falls back to contentRect when the size arrays are absent', () => {
    const el = document.createElement('div');
    const noSizes = {
      target: el,
      contentRect: { width: 7, height: 8 } as DOMRectReadOnly,
      borderBoxSize: undefined,
      contentBoxSize: undefined,
      devicePixelContentBoxSize: undefined,
    } as unknown as ResizeObserverEntry;
    expect(readBoxSize(noSizes, 'border-box')).toEqual({ width: 7, height: 8 });
    expect(readBoxSize(noSizes, 'content-box')).toEqual({
      width: 7,
      height: 8,
    });
    expect(readBoxSize(noSizes, 'device-pixel-content-box')).toEqual({
      width: 7,
      height: 8,
    });
  });

  it('falls back when the size array is empty', () => {
    const el = document.createElement('div');
    const emptySizes = {
      target: el,
      contentRect: { width: 3, height: 4 } as DOMRectReadOnly,
      borderBoxSize: [],
      contentBoxSize: [],
      devicePixelContentBoxSize: [],
    } as unknown as ResizeObserverEntry;
    expect(readBoxSize(emptySizes, 'border-box')).toEqual({
      width: 3,
      height: 4,
    });
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

describe('dimensionsEqual / toResizeEvent', () => {
  it('compares width and height only', () => {
    const el = document.createElement('div');
    const a = toResizeEvent(
      makeEntry({ target: el, width: 1, height: 2 }),
      'content-box',
      false,
    );
    const b = toResizeEvent(
      makeEntry({ target: el, width: 1, height: 2 }),
      'border-box',
      true,
    );
    const c = toResizeEvent(
      makeEntry({ target: el, width: 9, height: 2 }),
      'content-box',
      false,
    );
    expect(dimensionsEqual(a, b)).toBe(true);
    expect(dimensionsEqual(a, c)).toBe(false);
  });

  it('builds a complete event', () => {
    const el = document.createElement('div');
    const entry = makeEntry({ target: el, width: 12, height: 34 });
    const event = toResizeEvent(entry, 'border-box', true);
    expect(event).toEqual({
      target: el,
      contentRect: entry.contentRect,
      entry,
      width: 12,
      height: 34,
      box: 'border-box',
      initial: true,
    });
  });
});
