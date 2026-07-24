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

import { injectMutationObserver } from './mutation-observer.signal';
import type {
  DgMutationObserverOptions,
  DgMutationObserverRef,
  DgMutationTarget,
} from './mutation-observer.types';
import {
  installMockMutationObserver,
  MockMutationObserver,
  removeMutationObserver,
} from './testing/mock-mutation-observer';

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const SERVER: Provider[] = [{ provide: PLATFORM_ID, useValue: 'server' }];

/** Options the host picks up in its field initializer; set by `setup()`. */
let currentOptions: DgMutationObserverOptions = {};

/**
 * Host that observes its own `<div>` through a `viewChild` signal — the
 * intended real-world usage. Field initializers run during construction,
 * which is a valid injection context.
 */
@Component({
  selector: 'dg-signal-host',
  standalone: true,
  template: `<div #box></div>`,
})
class SignalHost {
  readonly boxRef = viewChild<ElementRef<HTMLElement>>('box');
  readonly mutations: DgMutationObserverRef = injectMutationObserver(
    this.boxRef,
    currentOptions,
  );
}

let restore: () => void;

function setup(
  options: DgMutationObserverOptions = {},
  providers: Provider[] = [],
): {
  fixture: ComponentFixture<SignalHost>;
  mutations: DgMutationObserverRef;
  element: HTMLElement;
} {
  currentOptions = options;
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [SignalHost], providers });
  const fixture = TestBed.createComponent(SignalHost);
  fixture.detectChanges();
  const element = fixture.nativeElement.querySelector('div') as HTMLElement;
  return { fixture, mutations: fixture.componentInstance.mutations, element };
}

beforeEach(() => {
  restore = installMockMutationObserver();
});

afterEach(() => {
  currentOptions = {};
  restore();
  TestBed.resetTestingModule();
});

describe('injectMutationObserver', () => {
  it('observes the resolved viewChild element', () => {
    const { element } = setup();
    expect(MockMutationObserver.last.isObserving(element)).toBe(true);
  });

  it('starts undefined before the first emission', () => {
    const { mutations } = setup();
    expect(mutations.records()).toBeUndefined();
    expect(mutations.event()).toBeUndefined();
  });

  it('reports records from the observer callback', () => {
    const { mutations, element } = setup();
    const record = MockMutationObserver.last.emitChildList(element);
    expect(mutations.records()).toEqual([record]);
    expect(mutations.event()?.target).toBe(element);
  });

  it('defaults to observing childList', () => {
    setup();
    expect(MockMutationObserver.last.init).toEqual({ childList: true });
  });

  it('passes a custom init through', () => {
    setup({ init: { attributes: true, subtree: true } });
    expect(MockMutationObserver.last.init).toEqual({
      attributes: true,
      subtree: true,
    });
  });

  it('normalizes an init with no valid flags', () => {
    setup({ init: { subtree: true } as never });
    expect(MockMutationObserver.last.init).toEqual({
      subtree: true,
      childList: true,
    });
  });

  it('re-observes when a reactive init option changes', () => {
    const init = signal<MutationObserverInit>({ childList: true });
    const { fixture } = setup({ init });
    const first = MockMutationObserver.last;
    init.set({ attributes: true });
    fixture.detectChanges();
    const next = MockMutationObserver.last;
    expect(next).not.toBe(first);
    expect(first.disconnected).toBe(true);
    expect(next.init).toEqual({ attributes: true });
  });

  it('accumulates records across multiple callback batches within a debounce window', async () => {
    const { mutations, element } = setup({ debounce: 40 });
    const observer = MockMutationObserver.last;
    observer.emitChildList(element);
    observer.emitChildList(element);
    expect(mutations.records()).toBeUndefined();
    await wait(80);
    expect(mutations.records()).toHaveLength(2);
  });

  it('reports isSupported = true in a supporting environment', () => {
    const { mutations } = setup();
    expect(mutations.isSupported()).toBe(true);
  });

  it('is SSR-safe: no observer, isSupported false, empty signals', () => {
    const { mutations } = setup({}, SERVER);
    expect(MockMutationObserver.instances).toHaveLength(0);
    expect(mutations.isSupported()).toBe(false);
    expect(mutations.records()).toBeUndefined();
  });

  it('reports isSupported = false when MutationObserver is missing', () => {
    const remove = removeMutationObserver();
    try {
      const { mutations } = setup();
      expect(mutations.isSupported()).toBe(false);
    } finally {
      remove();
    }
  });

  it('disconnects when the host is destroyed', () => {
    const { fixture } = setup();
    const observer = MockMutationObserver.last;
    fixture.destroy();
    expect(observer.disconnected).toBe(true);
  });
});

describe('injectMutationObserver target forms', () => {
  function observeTarget(target: DgMutationTarget): DgMutationObserverRef {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const ref = TestBed.runInInjectionContext(() =>
      injectMutationObserver(target),
    );
    TestBed.tick();
    return ref;
  }

  it('accepts a raw Node', () => {
    const el = document.createElement('div');
    const ref = observeTarget(el);
    expect(MockMutationObserver.last.isObserving(el)).toBe(true);
    expect(ref.isSupported()).toBe(true);
  });

  it('accepts an ElementRef', () => {
    const el = document.createElement('div');
    observeTarget(new ElementRef(el));
    expect(MockMutationObserver.last.isObserving(el)).toBe(true);
  });

  it('accepts a signal target and re-observes when it changes', () => {
    const a = document.createElement('div');
    const b = document.createElement('div');
    const target = signal<HTMLElement | undefined>(a);
    observeTarget(target);
    expect(MockMutationObserver.last.isObserving(a)).toBe(true);

    const first = MockMutationObserver.last;
    target.set(b);
    TestBed.tick();
    expect(first.disconnected).toBe(true);
    expect(MockMutationObserver.last.isObserving(b)).toBe(true);
  });

  it('observes nothing while the target is undefined', () => {
    const target = signal<HTMLElement | undefined>(undefined);
    observeTarget(target);
    expect(MockMutationObserver.instances).toHaveLength(0);
  });
});
