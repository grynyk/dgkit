import { Component, PLATFORM_ID, type Provider } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { ResizeObserverDirective } from './resize-observer.directive';
import type { DgResizeBox, DgResizeEvent } from './resize-observer.types';
import {
  installMockResizeObserver,
  makeEntry,
  MockResizeObserver,
  removeResizeObserver,
} from './testing/mock-resize-observer';
import {
  DG_DEFAULT_RESIZE_BOX,
  dimensionsEqual,
  isResizeObserverSupported,
  normalizeBox,
  normalizeDebounce,
  pickEntry,
  readBoxSize,
  toResizeEvent,
} from './resize-observer.utils';

/**
 * The minimal slice of a test runner's API shared by Jest and Vitest. Passing
 * these in (rather than relying on globals) keeps this file free of any
 * runner-specific import so the exact same suite runs under both.
 */
export interface TestApi {
  describe: (name: string, fn: () => void) => void;
  // `fn` is intentionally loosely typed so both Jest's and Vitest's `it`
  // (and a `fakeAsync`-wrapped callback) assign without variance friction.
  it: (name: string, fn: any) => void;
  expect: (actual: unknown) => any;
  beforeEach: (fn: any) => void;
  afterEach: (fn: any) => void;
}

@Component({
  selector: 'dg-resize-host',
  standalone: true,
  imports: [ResizeObserverDirective],
  template: `<div
    dgResizeObserver
    [resizeDebounce]="debounce"
    [resizeBox]="box"
    [resizeEmitInitial]="emitInitial"
    [resizeDistinct]="distinct"
    (dgResize)="onResize($event)"
  ></div>`,
})
class HostComponent {
  debounce = 0;
  box: DgResizeBox = 'content-box';
  emitInitial = false;
  distinct = false;
  readonly events: DgResizeEvent[] = [];
  onResize(event: DgResizeEvent): void {
    this.events.push(event);
  }
}

interface HostState {
  debounce?: number;
  box?: DgResizeBox;
  emitInitial?: boolean;
  distinct?: boolean;
}

/**
 * Wait for real wall-clock time. Angular's `fakeAsync`/`tick` relies on a
 * per-test `ProxyZone` that isn't installed under Vitest + Analog, so the
 * debounce tests use real (short) timers — which work identically under both
 * runners. RxJS `timer` schedules via `setTimeout`, so a real wait past the
 * debounce window reliably flushes it.
 */
const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Temporarily capture `console.warn` output without any runner spy API. */
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

export function runResizeObserverDirectiveSuite(api: TestApi): void {
  const { describe, it, expect, beforeEach, afterEach } = api;

  let restore: () => void;

  function setup(
    state: HostState = {},
    providers: Provider[] = [],
  ): {
    fixture: ComponentFixture<HostComponent>;
    host: HostComponent;
    element: HTMLElement;
  } {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [HostComponent], providers });
    const fixture = TestBed.createComponent(HostComponent);
    const host = fixture.componentInstance;
    host.debounce = state.debounce ?? 0;
    host.box = state.box ?? 'content-box';
    host.emitInitial = state.emitInitial ?? false;
    host.distinct = state.distinct ?? false;
    fixture.detectChanges();
    const element = fixture.nativeElement.querySelector('div') as HTMLElement;
    return { fixture, host, element };
  }

  const SERVER: Provider[] = [{ provide: PLATFORM_ID, useValue: 'server' }];

  beforeEach(() => {
    restore = installMockResizeObserver();
  });

  afterEach(() => {
    restore();
    TestBed.resetTestingModule();
  });

  // ---------------------------------------------------------------------------
  describe('creation and setup', () => {
    it('can be instantiated', () => {
      const { fixture } = setup();
      const directive = fixture.debugElement
        .query(By.directive(ResizeObserverDirective))
        .injector.get(ResizeObserverDirective);
      expect(directive).toBeTruthy();
    });

    it('observes the host element', () => {
      const { element } = setup();
      const observer = MockResizeObserver.last;
      expect(observer.isObserving(element)).toBe(true);
      expect(observer.observedElements).toHaveLength(1);
    });

    it('passes the requested box option to observe', () => {
      const { element } = setup({ box: 'border-box' });
      expect(MockResizeObserver.last.optionsFor(element)).toEqual({
        box: 'border-box',
      });
    });

    it('does not create an observer during SSR', () => {
      setup({}, SERVER);
      expect(MockResizeObserver.instances).toHaveLength(0);
    });

    it('does not crash when ResizeObserver is missing', () => {
      const removeRo = removeResizeObserver();
      try {
        expect(() => setup()).not.toThrow();
        expect(MockResizeObserver.instances).toHaveLength(0);
      } finally {
        removeRo();
      }
    });

    it('ignores an empty entry batch', () => {
      const { host } = setup({ emitInitial: true });
      MockResizeObserver.last.emit([]);
      expect(host.events).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  describe('event emission', () => {
    it('emits when the observer fires (after the initial measurement)', () => {
      const { host, element } = setup();
      const observer = MockResizeObserver.last;
      observer.emitSize(element, 100, 50); // initial — suppressed by default
      observer.emitSize(element, 200, 80);
      expect(host.events).toHaveLength(1);
      expect(host.events[0].width).toBe(200);
      expect(host.events[0].height).toBe(80);
    });

    it('emits the correct width and height', () => {
      const { host, element } = setup({ emitInitial: true });
      MockResizeObserver.last.emitSize(element, 320, 240);
      expect(host.events[0].width).toBe(320);
      expect(host.events[0].height).toBe(240);
    });

    it('exposes the original ResizeObserverEntry', () => {
      const { host, element } = setup({ emitInitial: true });
      const entry = makeEntry({ target: element, width: 10, height: 20 });
      MockResizeObserver.last.emit([entry]);
      expect(host.events[0].entry).toBe(entry);
      expect(host.events[0].target).toBe(element);
      expect(host.events[0].contentRect).toBe(entry.contentRect);
    });

    it('handles multiple entries and picks the host entry', () => {
      const { host, element } = setup({ emitInitial: true });
      const other = document.createElement('span');
      const otherEntry = makeEntry({ target: other, width: 1, height: 1 });
      const hostEntry = makeEntry({ target: element, width: 640, height: 480 });
      MockResizeObserver.last.emit([otherEntry, hostEntry]);
      expect(host.events).toHaveLength(1);
      expect(host.events[0].width).toBe(640);
      expect(host.events[0].target).toBe(element);
    });

    it('emits zero width and height', () => {
      const { host, element } = setup({ emitInitial: true });
      MockResizeObserver.last.emitSize(element, 0, 0);
      expect(host.events[0].width).toBe(0);
      expect(host.events[0].height).toBe(0);
    });

    it('preserves typed event data (box + initial flag)', () => {
      const { host, element } = setup({ emitInitial: true, box: 'border-box' });
      MockResizeObserver.last.emitSize(element, 5, 6);
      const event = host.events[0];
      expect(event.box).toBe('border-box');
      expect(event.initial).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  describe('debouncing', () => {
    it('emits synchronously when debounce is zero', () => {
      const { host, element } = setup({ emitInitial: true, debounce: 0 });
      MockResizeObserver.last.emitSize(element, 100, 100);
      expect(host.events).toHaveLength(1);
    });

    it('debounces positive values', async () => {
      const { host, element } = setup({ emitInitial: true, debounce: 40 });
      MockResizeObserver.last.emitSize(element, 100, 100);
      // Not emitted synchronously while the debounce window is open.
      expect(host.events).toHaveLength(0);
      await wait(80);
      expect(host.events).toHaveLength(1);
    });

    it('uses the latest event within the debounce window', async () => {
      const { host, element } = setup({ emitInitial: true, debounce: 40 });
      const observer = MockResizeObserver.last;
      observer.emitSize(element, 100, 100);
      observer.emitSize(element, 200, 200);
      await wait(80);
      expect(host.events).toHaveLength(1);
      expect(host.events[0].width).toBe(200);
    });

    it('collapses rapid consecutive events into one', async () => {
      const { host, element } = setup({ emitInitial: true, debounce: 40 });
      const observer = MockResizeObserver.last;
      // A synchronous burst — every event keeps resetting the debounce window.
      for (let i = 1; i <= 10; i++) {
        observer.emitSize(element, i * 10, i * 10);
      }
      expect(host.events).toHaveLength(0);
      await wait(80);
      expect(host.events).toHaveLength(1);
      expect(host.events[0].width).toBe(100);
    });

    it('normalizes a negative debounce to zero (synchronous)', () => {
      const { host, element } = setup({ emitInitial: true, debounce: -50 });
      MockResizeObserver.last.emitSize(element, 10, 10);
      expect(host.events).toHaveLength(1);
    });

    it('normalizes NaN debounce to zero (synchronous)', () => {
      const { host, element } = setup({
        emitInitial: true,
        debounce: Number.NaN,
      });
      MockResizeObserver.last.emitSize(element, 10, 10);
      expect(host.events).toHaveLength(1);
    });

    it('normalizes an infinite debounce to zero (synchronous)', () => {
      const { host, element } = setup({
        emitInitial: true,
        debounce: Number.POSITIVE_INFINITY,
      });
      MockResizeObserver.last.emitSize(element, 10, 10);
      expect(host.events).toHaveLength(1);
    });

    it('reacts to a debounce value changed at runtime', async () => {
      const { fixture, host, element } = setup({
        emitInitial: true,
        debounce: 0,
      });
      host.debounce = 40;
      fixture.detectChanges();
      MockResizeObserver.last.emitSize(element, 10, 10);
      expect(host.events).toHaveLength(0);
      await wait(80);
      expect(host.events).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  describe('distinct behavior', () => {
    it('suppresses identical dimensions when enabled', () => {
      const { host, element } = setup({ emitInitial: true, distinct: true });
      const observer = MockResizeObserver.last;
      observer.emitSize(element, 100, 50);
      observer.emitSize(element, 100, 50);
      expect(host.events).toHaveLength(1);
    });

    it('emits identical dimensions when disabled', () => {
      const { host, element } = setup({ emitInitial: true, distinct: false });
      const observer = MockResizeObserver.last;
      observer.emitSize(element, 100, 50);
      observer.emitSize(element, 100, 50);
      expect(host.events).toHaveLength(2);
    });

    it('emits when the width changes', () => {
      const { host, element } = setup({ emitInitial: true, distinct: true });
      const observer = MockResizeObserver.last;
      observer.emitSize(element, 100, 50);
      observer.emitSize(element, 200, 50);
      expect(host.events).toHaveLength(2);
    });

    it('emits when the height changes', () => {
      const { host, element } = setup({ emitInitial: true, distinct: true });
      const observer = MockResizeObserver.last;
      observer.emitSize(element, 100, 50);
      observer.emitSize(element, 100, 90);
      expect(host.events).toHaveLength(2);
    });

    it('ignores the box when comparing dimensions', () => {
      const { fixture, host, element } = setup({
        emitInitial: true,
        distinct: true,
        box: 'content-box',
      });
      MockResizeObserver.last.emitSize(element, 100, 50);
      host.box = 'border-box';
      fixture.detectChanges();
      // Same dimensions under a different box → still treated as a duplicate.
      MockResizeObserver.last.emit([
        makeEntry({ target: element, width: 100, height: 50 }),
      ]);
      expect(host.events).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  describe('initial emission', () => {
    it('emits an initial measurement when enabled', () => {
      const { host, element } = setup({ emitInitial: true });
      MockResizeObserver.last.emitSize(element, 100, 50);
      expect(host.events).toHaveLength(1);
      expect(host.events[0].initial).toBe(true);
    });

    it('does not emit initially when disabled', () => {
      const { host, element } = setup({ emitInitial: false });
      MockResizeObserver.last.emitSize(element, 100, 50);
      expect(host.events).toHaveLength(0);
    });

    it('reports the correct dimensions for the initial event', () => {
      const { host, element } = setup({ emitInitial: true });
      MockResizeObserver.last.emitSize(element, 123, 45);
      expect(host.events[0].width).toBe(123);
      expect(host.events[0].height).toBe(45);
    });

    it('is SSR-safe (no observer, no emission)', () => {
      const { host } = setup({ emitInitial: true }, SERVER);
      expect(MockResizeObserver.instances).toHaveLength(0);
      expect(host.events).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  describe('destruction', () => {
    it('disconnects the observer on destroy', () => {
      const { fixture } = setup();
      const observer = MockResizeObserver.last;
      fixture.destroy();
      expect(observer.disconnected).toBe(true);
      expect(observer.disconnectCount).toBe(1);
    });

    it('does not emit after destroy', () => {
      const { fixture, host, element } = setup({ emitInitial: true });
      const observer = MockResizeObserver.last;
      fixture.destroy();
      observer.emitSize(element, 10, 10);
      expect(host.events).toHaveLength(0);
    });

    it('is safe to destroy when the observer was never created', () => {
      const { fixture } = setup({}, SERVER);
      expect(() => fixture.destroy()).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  describe('input behavior', () => {
    it('uses correct default values', () => {
      const { host, element } = setup();
      // default box is content-box
      expect(MockResizeObserver.last.optionsFor(element)).toEqual({
        box: 'content-box',
      });
      // default emitInitial is false → first measurement is suppressed
      MockResizeObserver.last.emitSize(element, 1, 1);
      expect(host.events).toHaveLength(0);
    });

    it('accepts every valid box value', () => {
      for (const box of [
        'content-box',
        'border-box',
        'device-pixel-content-box',
      ] as const) {
        const { element } = setup({ box });
        expect(MockResizeObserver.last.optionsFor(element)).toEqual({ box });
      }
    });

    it('falls back to content-box for invalid runtime values', () => {
      const { element } = setup({ box: 'nonsense' as unknown as DgResizeBox });
      expect(MockResizeObserver.last.optionsFor(element)).toEqual({
        box: 'content-box',
      });
    });

    it('falls back to default observation when a box option is unsupported', () => {
      MockResizeObserver.throwOnBox = 'device-pixel-content-box';
      const { element } = setup({ box: 'device-pixel-content-box' });
      const observer = MockResizeObserver.last;
      expect(observer.isObserving(element)).toBe(true);
      // observe() fell back to the no-options overload
      expect(observer.optionsFor(element)).toBeUndefined();
    });

    it('re-observes when the box changes at runtime', () => {
      const { fixture, host, element } = setup({ box: 'content-box' });
      host.box = 'border-box';
      fixture.detectChanges();
      const observer = MockResizeObserver.last;
      expect(observer.isObserving(element)).toBe(true);
      expect(observer.optionsFor(element)).toEqual({ box: 'border-box' });
    });

    it('exposes inputs under the documented aliases', () => {
      const { fixture } = setup({ box: 'border-box', debounce: 42 });
      const directive = fixture.debugElement
        .query(By.directive(ResizeObserverDirective))
        .injector.get(ResizeObserverDirective);
      expect(directive.resizeBox()).toBe('border-box');
      expect(directive.resizeDebounce()).toBe(42);
    });
  });

  // ---------------------------------------------------------------------------
  describe('browser and SSR behavior', () => {
    it('creates no observer on the server platform', () => {
      setup({}, SERVER);
      expect(MockResizeObserver.instances).toHaveLength(0);
    });

    it('handles an unsupported ResizeObserver gracefully', () => {
      const removeRo = removeResizeObserver();
      try {
        const { host, element } = setup({ emitInitial: true });
        expect(MockResizeObserver.instances).toHaveLength(0);
        // Nothing to emit through; the directive is simply inert.
        expect(host.events).toHaveLength(0);
        expect(element).toBeTruthy();
      } finally {
        removeRo();
      }
    });

    it('warns in dev mode when ResizeObserver is unavailable', () => {
      const removeRo = removeResizeObserver();
      try {
        const messages = captureWarnings(() => setup());
        expect(messages.length).toBe(1);
        expect(messages[0]).toContain('ResizeObserver');
      } finally {
        removeRo();
      }
    });
  });

  // ---------------------------------------------------------------------------
  describe('utils', () => {
    it('normalizeBox accepts valid boxes and rejects the rest', () => {
      expect(normalizeBox('border-box')).toBe('border-box');
      expect(normalizeBox('device-pixel-content-box')).toBe(
        'device-pixel-content-box',
      );
      expect(normalizeBox('content-box')).toBe('content-box');
      expect(normalizeBox('bogus')).toBe(DG_DEFAULT_RESIZE_BOX);
      expect(normalizeBox(undefined)).toBe(DG_DEFAULT_RESIZE_BOX);
      expect(normalizeBox(null)).toBe(DG_DEFAULT_RESIZE_BOX);
    });

    it('normalizeDebounce clamps invalid values to zero', () => {
      expect(normalizeDebounce(100)).toBe(100);
      expect(normalizeDebounce(0)).toBe(0);
      expect(normalizeDebounce(-1)).toBe(0);
      expect(normalizeDebounce(Number.NaN)).toBe(0);
      expect(normalizeDebounce(Number.POSITIVE_INFINITY)).toBe(0);
      expect(normalizeDebounce('250')).toBe(250);
      expect(normalizeDebounce('abc')).toBe(0);
    });

    it('isResizeObserverSupported reflects the environment', () => {
      expect(isResizeObserverSupported()).toBe(true);
      const removeRo = removeResizeObserver();
      try {
        expect(isResizeObserverSupported()).toBe(false);
      } finally {
        removeRo();
      }
    });

    it('pickEntry prefers the matching target and falls back sensibly', () => {
      const a = document.createElement('div');
      const b = document.createElement('div');
      const entryA = makeEntry({ target: a, width: 1, height: 1 });
      const entryB = makeEntry({ target: b, width: 2, height: 2 });
      expect(pickEntry([entryA, entryB], b)).toBe(entryB);
      expect(pickEntry([entryA, entryB], document.createElement('p'))).toBe(
        entryB,
      );
      expect(pickEntry([], a)).toBeUndefined();
    });

    it('readBoxSize reads the requested box with a contentRect fallback', () => {
      const el = document.createElement('div');
      const entry = makeEntry({ target: el, width: 30, height: 40 });
      expect(readBoxSize(entry, 'content-box')).toEqual({
        width: 30,
        height: 40,
      });
      expect(readBoxSize(entry, 'border-box')).toEqual({
        width: 30,
        height: 40,
      });
      expect(readBoxSize(entry, 'device-pixel-content-box')).toEqual({
        width: 30,
        height: 40,
      });

      const noSizes = {
        target: el,
        contentRect: { width: 7, height: 8 } as DOMRectReadOnly,
        borderBoxSize: undefined,
        contentBoxSize: undefined,
        devicePixelContentBoxSize: undefined,
      } as unknown as ResizeObserverEntry;
      expect(readBoxSize(noSizes, 'border-box')).toEqual({
        width: 7,
        height: 8,
      });
    });

    it('dimensionsEqual compares width and height only', () => {
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
  });
}
