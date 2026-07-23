import {
  Component,
  ElementRef,
  PLATFORM_ID,
  type Provider,
  signal,
  viewChild,
} from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { injectResizeObserver } from './resize-observer.signal';
import type {
  DgResizeObserverOptions,
  DgResizeObserverRef,
  DgResizeTarget,
} from './resize-observer.types';
import {
  installMockResizeObserver,
  MockResizeObserver,
  removeResizeObserver,
} from './testing/mock-resize-observer';

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const SERVER: Provider[] = [{ provide: PLATFORM_ID, useValue: 'server' }];

/** Options the host picks up in its field initializer; set by `setup()`. */
let currentOptions: DgResizeObserverOptions = {};

/**
 * Host that observes its own `<div>` through a `viewChild` signal — the
 * intended real-world usage. Field initializers run during construction, which
 * is a valid injection context.
 */
@Component({
  selector: 'dg-signal-host',
  standalone: true,
  template: `<div #box></div>`,
})
class SignalHost {
  readonly boxRef = viewChild<ElementRef<HTMLElement>>('box');
  readonly size: DgResizeObserverRef = injectResizeObserver(
    this.boxRef,
    currentOptions,
  );
}

let restore: () => void;

function setup(
  options: DgResizeObserverOptions = {},
  providers: Provider[] = [],
): {
  fixture: ComponentFixture<SignalHost>;
  size: DgResizeObserverRef;
  element: HTMLElement;
} {
  currentOptions = options;
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [SignalHost], providers });
  const fixture = TestBed.createComponent(SignalHost);
  fixture.detectChanges();
  const element = fixture.nativeElement.querySelector('div') as HTMLElement;
  return { fixture, size: fixture.componentInstance.size, element };
}

beforeEach(() => {
  restore = installMockResizeObserver();
});

afterEach(() => {
  currentOptions = {};
  restore();
  TestBed.resetTestingModule();
});

describe('injectResizeObserver', () => {
  it('observes the resolved viewChild element', () => {
    const { element } = setup();
    expect(MockResizeObserver.last.isObserving(element)).toBe(true);
  });

  it('starts at zero before the first measurement', () => {
    const { size } = setup();
    expect(size.width()).toBe(0);
    expect(size.height()).toBe(0);
    expect(size.entry()).toBeUndefined();
    expect(size.event()).toBeUndefined();
  });

  it('updates width and height signals from the observer callback', () => {
    const { size, element } = setup();
    MockResizeObserver.last.emitSize(element, 320, 240);
    expect(size.width()).toBe(320);
    expect(size.height()).toBe(240);
  });

  it('reports the initial measurement by default', () => {
    const { size, element } = setup();
    MockResizeObserver.last.emitSize(element, 10, 20);
    expect(size.event()?.initial).toBe(true);
  });

  it('can opt out of the initial measurement', () => {
    const { size, element } = setup({ emitInitial: false });
    MockResizeObserver.last.emitSize(element, 10, 20);
    expect(size.event()).toBeUndefined();
    MockResizeObserver.last.emitSize(element, 30, 40);
    expect(size.width()).toBe(30);
  });

  it('exposes the raw entry', () => {
    const { size, element } = setup();
    const entry = MockResizeObserver.last.emitSize(element, 1, 2);
    expect(size.entry()).toBe(entry);
  });

  it('passes the requested box to observe', () => {
    const { element } = setup({ box: 'border-box' });
    expect(MockResizeObserver.last.optionsFor(element)).toEqual({
      box: 'border-box',
    });
  });

  it('normalizes an invalid box at runtime', () => {
    const { element } = setup({ box: 'bogus' as never });
    expect(MockResizeObserver.last.optionsFor(element)).toEqual({
      box: 'content-box',
    });
  });

  it('re-observes when a reactive box option changes', () => {
    const box = signal<'content-box' | 'border-box'>('content-box');
    const { fixture, element } = setup({ box });
    const first = MockResizeObserver.last;
    box.set('border-box');
    fixture.detectChanges();
    const next = MockResizeObserver.last;
    expect(next).not.toBe(first);
    expect(first.disconnected).toBe(true);
    expect(next.optionsFor(element)).toEqual({ box: 'border-box' });
  });

  it('suppresses duplicate sizes by default', () => {
    const { size, element } = setup();
    MockResizeObserver.last.emitSize(element, 100, 50);
    const first = size.event();
    MockResizeObserver.last.emitSize(element, 100, 50);
    expect(size.event()).toBe(first);
  });

  it('reports duplicates when distinct is disabled', () => {
    const { size, element } = setup({ distinct: false });
    MockResizeObserver.last.emitSize(element, 100, 50);
    const first = size.event();
    MockResizeObserver.last.emitSize(element, 100, 50);
    expect(size.event()).not.toBe(first);
  });

  it('debounces when configured', async () => {
    const { size, element } = setup({ debounce: 40 });
    MockResizeObserver.last.emitSize(element, 100, 50);
    expect(size.width()).toBe(0);
    await wait(80);
    expect(size.width()).toBe(100);
  });

  it('reports isSupported = true in a supporting environment', () => {
    const { size } = setup();
    expect(size.isSupported()).toBe(true);
  });

  it('is SSR-safe: no observer, isSupported false, zeroed signals', () => {
    const { size } = setup({}, SERVER);
    expect(MockResizeObserver.instances).toHaveLength(0);
    expect(size.isSupported()).toBe(false);
    expect(size.width()).toBe(0);
    expect(size.height()).toBe(0);
  });

  it('reports isSupported = false when ResizeObserver is missing', () => {
    const removeRo = removeResizeObserver();
    try {
      const { size } = setup();
      expect(size.isSupported()).toBe(false);
    } finally {
      removeRo();
    }
  });

  it('disconnects when the host is destroyed', () => {
    const { fixture } = setup();
    const observer = MockResizeObserver.last;
    fixture.destroy();
    expect(observer.disconnected).toBe(true);
  });
});

describe('injectResizeObserver target forms', () => {
  function observeTarget(target: DgResizeTarget): DgResizeObserverRef {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const ref = TestBed.runInInjectionContext(() =>
      injectResizeObserver(target),
    );
    TestBed.tick();
    return ref;
  }

  it('accepts a raw Element', () => {
    const el = document.createElement('div');
    const ref = observeTarget(el);
    expect(MockResizeObserver.last.isObserving(el)).toBe(true);
    expect(ref.isSupported()).toBe(true);
  });

  it('accepts an ElementRef', () => {
    const el = document.createElement('div');
    observeTarget(new ElementRef(el));
    expect(MockResizeObserver.last.isObserving(el)).toBe(true);
  });

  it('accepts a signal target and re-observes when it changes', () => {
    const a = document.createElement('div');
    const b = document.createElement('div');
    const target = signal<HTMLElement | undefined>(a);
    observeTarget(target);
    expect(MockResizeObserver.last.isObserving(a)).toBe(true);

    const first = MockResizeObserver.last;
    target.set(b);
    TestBed.tick();
    expect(first.disconnected).toBe(true);
    expect(MockResizeObserver.last.isObserving(b)).toBe(true);
  });

  it('observes nothing while the target is undefined', () => {
    const target = signal<HTMLElement | undefined>(undefined);
    observeTarget(target);
    expect(MockResizeObserver.instances).toHaveLength(0);
  });
});
