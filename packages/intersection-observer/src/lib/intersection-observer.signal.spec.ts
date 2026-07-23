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

import { injectIntersectionObserver } from './intersection-observer.signal';
import type {
  DgIntersectionObserverOptions,
  DgIntersectionObserverRef,
  DgIntersectionTarget,
} from './intersection-observer.types';
import {
  installMockIntersectionObserver,
  MockIntersectionObserver,
  removeIntersectionObserver,
} from './testing/mock-intersection-observer';

const SERVER: Provider[] = [{ provide: PLATFORM_ID, useValue: 'server' }];

let currentOptions: DgIntersectionObserverOptions = {};

@Component({
  selector: 'dg-intersect-signal-host',
  standalone: true,
  template: `<div #anchor></div>`,
})
class SignalHost {
  readonly anchor = viewChild<ElementRef<HTMLElement>>('anchor');
  readonly visibility: DgIntersectionObserverRef = injectIntersectionObserver(
    this.anchor,
    currentOptions,
  );
}

let restore: () => void;

function setup(
  options: DgIntersectionObserverOptions = {},
  providers: Provider[] = [],
): {
  fixture: ComponentFixture<SignalHost>;
  visibility: DgIntersectionObserverRef;
  element: HTMLElement;
} {
  currentOptions = options;
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [SignalHost], providers });
  const fixture = TestBed.createComponent(SignalHost);
  fixture.detectChanges();
  const element = fixture.nativeElement.querySelector('div') as HTMLElement;
  return { fixture, visibility: fixture.componentInstance.visibility, element };
}

beforeEach(() => {
  restore = installMockIntersectionObserver();
});

afterEach(() => {
  currentOptions = {};
  restore();
  TestBed.resetTestingModule();
});

describe('injectIntersectionObserver', () => {
  it('observes the resolved viewChild element', () => {
    const { element } = setup();
    expect(MockIntersectionObserver.last.isObserving(element)).toBe(true);
  });

  it('starts not-intersecting with ratio 0', () => {
    const { visibility } = setup();
    expect(visibility.isIntersecting()).toBe(false);
    expect(visibility.ratio()).toBe(0);
    expect(visibility.entry()).toBeUndefined();
    expect(visibility.event()).toBeUndefined();
  });

  it('updates signals from the observer callback', () => {
    const { visibility, element } = setup();
    MockIntersectionObserver.last.emitState(element, true, 0.6);
    expect(visibility.isIntersecting()).toBe(true);
    expect(visibility.ratio()).toBe(0.6);
  });

  it('exposes the raw entry', () => {
    const { visibility, element } = setup();
    const entry = MockIntersectionObserver.last.emitState(element, true);
    expect(visibility.entry()).toBe(entry);
  });

  it('reports the initial callback by default', () => {
    const { visibility, element } = setup();
    MockIntersectionObserver.last.emitState(element, false);
    expect(visibility.event()).toBeDefined();
    expect(visibility.isIntersecting()).toBe(false);
  });

  it('can opt out of the initial callback', () => {
    const { visibility, element } = setup({ emitInitial: false });
    MockIntersectionObserver.last.emitState(element, false);
    expect(visibility.event()).toBeUndefined();
    MockIntersectionObserver.last.emitState(element, true);
    expect(visibility.isIntersecting()).toBe(true);
  });

  it('passes rootMargin and threshold through', () => {
    setup({ rootMargin: '150px', threshold: [0, 1] });
    const observer = MockIntersectionObserver.last;
    expect(observer.rootMargin).toBe('150px');
    expect(observer.thresholds).toEqual([0, 1]);
  });

  it('normalizes invalid options', () => {
    setup({ rootMargin: '  ', threshold: -3 });
    const observer = MockIntersectionObserver.last;
    expect(observer.rootMargin).toBe('0px');
    expect(observer.thresholds).toEqual([0]);
  });

  it('recreates the observer when a reactive option changes', () => {
    const margin = signal('0px');
    const { fixture } = setup({ rootMargin: margin });
    const first = MockIntersectionObserver.last;
    margin.set('500px');
    fixture.detectChanges();
    expect(MockIntersectionObserver.last).not.toBe(first);
    expect(MockIntersectionObserver.last.rootMargin).toBe('500px');
  });

  it('stops observing after the first intersection when once is set', () => {
    const { visibility, element } = setup({ once: true });
    const observer = MockIntersectionObserver.last;
    observer.emitState(element, true);
    expect(observer.disconnected).toBe(true);
    expect(visibility.isIntersecting()).toBe(true);
  });

  it('reports isSupported = true in a supporting environment', () => {
    expect(setup().visibility.isSupported()).toBe(true);
  });

  it('is SSR-safe: no observer, isSupported false, defaults kept', () => {
    const { visibility } = setup({}, SERVER);
    expect(MockIntersectionObserver.instances).toHaveLength(0);
    expect(visibility.isSupported()).toBe(false);
    expect(visibility.isIntersecting()).toBe(false);
    expect(visibility.ratio()).toBe(0);
  });

  it('reports isSupported = false when IntersectionObserver is missing', () => {
    const removeIo = removeIntersectionObserver();
    try {
      expect(setup().visibility.isSupported()).toBe(false);
    } finally {
      removeIo();
    }
  });

  it('disconnects when the host is destroyed', () => {
    const { fixture } = setup();
    const observer = MockIntersectionObserver.last;
    fixture.destroy();
    expect(observer.disconnected).toBe(true);
  });
});

describe('injectIntersectionObserver target forms', () => {
  function observeTarget(
    target: DgIntersectionTarget,
  ): DgIntersectionObserverRef {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const ref = TestBed.runInInjectionContext(() =>
      injectIntersectionObserver(target),
    );
    TestBed.tick();
    return ref;
  }

  it('accepts a raw Element', () => {
    const el = document.createElement('div');
    const ref = observeTarget(el);
    expect(MockIntersectionObserver.last.isObserving(el)).toBe(true);
    expect(ref.isSupported()).toBe(true);
  });

  it('accepts an ElementRef', () => {
    const el = document.createElement('div');
    observeTarget(new ElementRef(el));
    expect(MockIntersectionObserver.last.isObserving(el)).toBe(true);
  });

  it('accepts a signal target and re-observes when it changes', () => {
    const a = document.createElement('div');
    const b = document.createElement('div');
    const target = signal<HTMLElement | undefined>(a);
    observeTarget(target);
    const first = MockIntersectionObserver.last;
    expect(first.isObserving(a)).toBe(true);
    target.set(b);
    TestBed.tick();
    expect(first.disconnected).toBe(true);
    expect(MockIntersectionObserver.last.isObserving(b)).toBe(true);
  });

  it('observes nothing while the target is undefined', () => {
    observeTarget(signal<HTMLElement | undefined>(undefined));
    expect(MockIntersectionObserver.instances).toHaveLength(0);
  });
});
