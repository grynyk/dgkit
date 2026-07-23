import { Component, PLATFORM_ID, type Provider } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { IntersectionObserverDirective } from './intersection-observer.directive';
import type { DgIntersectEvent } from './intersection-observer.types';
import {
  installMockIntersectionObserver,
  makeIntersectionEntry,
  MockIntersectionObserver,
  removeIntersectionObserver,
} from './testing/mock-intersection-observer';

@Component({
  selector: 'dg-intersect-host',
  standalone: true,
  imports: [IntersectionObserverDirective],
  template: `<div
    dgIntersectionObserver
    [intersectRootMargin]="rootMargin"
    [intersectThreshold]="threshold"
    [intersectOnce]="once"
    [intersectEmitInitial]="emitInitial"
    (dgIntersect)="onIntersect($event)"
  ></div>`,
})
class HostComponent {
  rootMargin = '0px';
  threshold: number | number[] = 0;
  once = false;
  emitInitial = false;
  readonly events: DgIntersectEvent[] = [];
  onIntersect(event: DgIntersectEvent): void {
    this.events.push(event);
  }
}

interface HostState {
  rootMargin?: string;
  threshold?: number | number[];
  once?: boolean;
  emitInitial?: boolean;
}

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

const SERVER: Provider[] = [{ provide: PLATFORM_ID, useValue: 'server' }];

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
  host.rootMargin = state.rootMargin ?? '0px';
  host.threshold = state.threshold ?? 0;
  host.once = state.once ?? false;
  host.emitInitial = state.emitInitial ?? false;
  fixture.detectChanges();
  const element = fixture.nativeElement.querySelector('div') as HTMLElement;
  return { fixture, host, element };
}

beforeEach(() => {
  restore = installMockIntersectionObserver();
});

afterEach(() => {
  restore();
  TestBed.resetTestingModule();
});

describe('creation and setup', () => {
  it('can be instantiated', () => {
    const { fixture } = setup();
    const directive = fixture.debugElement
      .query(By.directive(IntersectionObserverDirective))
      .injector.get(IntersectionObserverDirective);
    expect(directive).toBeTruthy();
  });

  it('observes the host element', () => {
    const { element } = setup();
    expect(MockIntersectionObserver.last.isObserving(element)).toBe(true);
    expect(MockIntersectionObserver.last.observedElements).toHaveLength(1);
  });

  it('passes rootMargin and threshold to the observer', () => {
    setup({ rootMargin: '200px', threshold: [0, 0.5, 1] });
    const observer = MockIntersectionObserver.last;
    expect(observer.rootMargin).toBe('200px');
    expect(observer.thresholds).toEqual([0, 0.5, 1]);
  });

  it('defaults the root to the viewport (null)', () => {
    setup();
    expect(MockIntersectionObserver.last.root).toBeNull();
  });

  it('does not create an observer during SSR', () => {
    setup({}, SERVER);
    expect(MockIntersectionObserver.instances).toHaveLength(0);
  });

  it('does not crash when IntersectionObserver is missing', () => {
    const removeIo = removeIntersectionObserver();
    try {
      expect(() => setup()).not.toThrow();
      expect(MockIntersectionObserver.instances).toHaveLength(0);
    } finally {
      removeIo();
    }
  });

  it('ignores an empty entry batch', () => {
    const { host } = setup({ emitInitial: true });
    MockIntersectionObserver.last.emit([]);
    expect(host.events).toHaveLength(0);
  });
});

describe('event emission', () => {
  it('emits after the initial callback', () => {
    const { host, element } = setup();
    const observer = MockIntersectionObserver.last;
    observer.emitState(element, false); // initial — suppressed by default
    observer.emitState(element, true, 1);
    expect(host.events).toHaveLength(1);
    expect(host.events[0].isIntersecting).toBe(true);
    expect(host.events[0].ratio).toBe(1);
  });

  it('exposes the original entry and target', () => {
    const { host, element } = setup({ emitInitial: true });
    const entry = makeIntersectionEntry({
      target: element,
      isIntersecting: true,
    });
    MockIntersectionObserver.last.emit([entry]);
    expect(host.events[0].entry).toBe(entry);
    expect(host.events[0].target).toBe(element);
  });

  it('handles multiple entries and picks the host entry', () => {
    const { host, element } = setup({ emitInitial: true });
    const other = document.createElement('span');
    MockIntersectionObserver.last.emit([
      makeIntersectionEntry({ target: other, isIntersecting: false }),
      makeIntersectionEntry({
        target: element,
        isIntersecting: true,
        intersectionRatio: 0.75,
      }),
    ]);
    expect(host.events).toHaveLength(1);
    expect(host.events[0].target).toBe(element);
    expect(host.events[0].ratio).toBe(0.75);
  });

  it('reports partial ratios', () => {
    const { host, element } = setup({ emitInitial: true });
    MockIntersectionObserver.last.emitState(element, true, 0.25);
    expect(host.events[0].ratio).toBe(0.25);
  });
});

describe('initial emission', () => {
  it('emits the initial callback when enabled', () => {
    const { host, element } = setup({ emitInitial: true });
    MockIntersectionObserver.last.emitState(element, false);
    expect(host.events).toHaveLength(1);
  });

  it('suppresses the initial callback by default', () => {
    const { host, element } = setup();
    MockIntersectionObserver.last.emitState(element, false);
    expect(host.events).toHaveLength(0);
  });
});

describe('once', () => {
  it('disconnects after the first intersection', () => {
    const { host, element } = setup({ once: true, emitInitial: true });
    const observer = MockIntersectionObserver.last;
    observer.emitState(element, true);
    expect(observer.disconnected).toBe(true);
    expect(host.events).toHaveLength(1);
  });

  it('keeps observing while the target has not intersected', () => {
    const { element } = setup({ once: true, emitInitial: true });
    const observer = MockIntersectionObserver.last;
    observer.emitState(element, false);
    expect(observer.disconnected).toBe(false);
  });

  it('keeps observing when once is disabled', () => {
    const { element } = setup({ once: false, emitInitial: true });
    const observer = MockIntersectionObserver.last;
    observer.emitState(element, true);
    expect(observer.disconnected).toBe(false);
  });
});

describe('reactive options', () => {
  it('recreates the observer when rootMargin changes', () => {
    const { fixture, host, element } = setup({ rootMargin: '0px' });
    const first = MockIntersectionObserver.last;
    host.rootMargin = '300px';
    fixture.detectChanges();
    const next = MockIntersectionObserver.last;
    expect(next).not.toBe(first);
    expect(first.disconnected).toBe(true);
    expect(next.rootMargin).toBe('300px');
    expect(next.isObserving(element)).toBe(true);
  });

  it('recreates the observer when threshold changes', () => {
    const { fixture, host } = setup({ threshold: 0 });
    const first = MockIntersectionObserver.last;
    host.threshold = 0.5;
    fixture.detectChanges();
    expect(MockIntersectionObserver.last).not.toBe(first);
    expect(MockIntersectionObserver.last.thresholds).toEqual([0.5]);
  });

  it('normalizes invalid rootMargin and threshold', () => {
    setup({ rootMargin: '', threshold: 5 });
    const observer = MockIntersectionObserver.last;
    expect(observer.rootMargin).toBe('0px');
    expect(observer.thresholds).toEqual([1]);
  });
});

describe('destruction', () => {
  it('disconnects on destroy', () => {
    const { fixture } = setup();
    const observer = MockIntersectionObserver.last;
    fixture.destroy();
    expect(observer.disconnected).toBe(true);
  });

  it('does not emit after destroy', () => {
    const { fixture, host, element } = setup({ emitInitial: true });
    const observer = MockIntersectionObserver.last;
    fixture.destroy();
    observer.emitState(element, true);
    expect(host.events).toHaveLength(0);
  });

  it('is safe to destroy when no observer was created', () => {
    const { fixture } = setup({}, SERVER);
    expect(() => fixture.destroy()).not.toThrow();
  });
});

describe('browser and SSR behavior', () => {
  it('warns in dev mode when IntersectionObserver is unavailable', () => {
    const removeIo = removeIntersectionObserver();
    try {
      const messages = captureWarnings(() => setup());
      expect(messages).toHaveLength(1);
      expect(messages[0]).toContain('IntersectionObserver');
    } finally {
      removeIo();
    }
  });

  it('does not warn on the server platform', () => {
    const removeIo = removeIntersectionObserver();
    try {
      expect(captureWarnings(() => setup({}, SERVER))).toHaveLength(0);
    } finally {
      removeIo();
    }
  });
});
