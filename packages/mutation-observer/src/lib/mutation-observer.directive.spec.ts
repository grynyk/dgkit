import { Component, PLATFORM_ID, type Provider } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { MutationObserverDirective } from './mutation-observer.directive';
import type { DgMutationEvent } from './mutation-observer.types';
import {
  installMockMutationObserver,
  MockMutationObserver,
  removeMutationObserver,
} from './testing/mock-mutation-observer';

@Component({
  selector: 'dg-mutation-host',
  standalone: true,
  imports: [MutationObserverDirective],
  template: `<div
    dgMutationObserver
    [mutationChildList]="childList"
    [mutationSubtree]="subtree"
    [mutationAttributes]="attributes"
    [mutationDebounce]="debounce"
    (dgMutation)="onMutation($event)"
  ></div>`,
})
class HostComponent {
  childList = true;
  subtree = false;
  attributes = false;
  debounce = 0;
  readonly events: DgMutationEvent[] = [];
  onMutation(event: DgMutationEvent): void {
    this.events.push(event);
  }
}

interface HostState {
  childList?: boolean;
  subtree?: boolean;
  attributes?: boolean;
  debounce?: number;
}

/**
 * Wait for real wall-clock time. `fakeAsync`/`tick` rely on a per-test
 * `ProxyZone` that isn't installed under Vitest + Analog, so the debounce
 * tests use real (short) timers.
 */
const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

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
  host.childList = state.childList ?? true;
  host.subtree = state.subtree ?? false;
  host.attributes = state.attributes ?? false;
  host.debounce = state.debounce ?? 0;
  fixture.detectChanges();
  const element = fixture.nativeElement.querySelector('div') as HTMLElement;
  return { fixture, host, element };
}

beforeEach(() => {
  restore = installMockMutationObserver();
});

afterEach(() => {
  restore();
  TestBed.resetTestingModule();
});

describe('creation and setup', () => {
  it('can be instantiated', () => {
    const { fixture } = setup();
    const directive = fixture.debugElement
      .query(By.directive(MutationObserverDirective))
      .injector.get(MutationObserverDirective);
    expect(directive).toBeTruthy();
  });

  it('observes the host element', () => {
    const { element } = setup();
    expect(MockMutationObserver.last.isObserving(element)).toBe(true);
  });

  it('passes the requested init to observe', () => {
    setup({ childList: false, attributes: true });
    expect(MockMutationObserver.last.init).toEqual({
      childList: false,
      subtree: false,
      attributes: true,
      attributeFilter: undefined,
      attributeOldValue: false,
      characterData: false,
      characterDataOldValue: false,
    });
  });

  it('normalizes an init with every flag disabled to childList', () => {
    setup({ childList: false, attributes: false });
    expect(MockMutationObserver.last.init?.childList).toBe(true);
  });

  it('does not create an observer during SSR', () => {
    setup({}, SERVER);
    expect(MockMutationObserver.instances).toHaveLength(0);
  });

  it('does not crash when MutationObserver is missing', () => {
    const remove = removeMutationObserver();
    try {
      expect(() => setup()).not.toThrow();
      expect(MockMutationObserver.instances).toHaveLength(0);
    } finally {
      remove();
    }
  });
});

describe('event emission', () => {
  it('emits when the observer fires', () => {
    const { host, element } = setup();
    MockMutationObserver.last.emitChildList(element);
    expect(host.events).toHaveLength(1);
    expect(host.events[0].target).toBe(element);
    expect(host.events[0].records).toHaveLength(1);
  });

  it('does not emit on an empty record batch', () => {
    const { host } = setup();
    MockMutationObserver.last.emit([]);
    expect(host.events).toHaveLength(0);
  });
});

describe('debouncing', () => {
  it('emits synchronously when debounce is zero', () => {
    const { host, element } = setup({ debounce: 0 });
    MockMutationObserver.last.emitChildList(element);
    expect(host.events).toHaveLength(1);
  });

  it('debounces positive values', async () => {
    const { host, element } = setup({ debounce: 40 });
    MockMutationObserver.last.emitChildList(element);
    expect(host.events).toHaveLength(0);
    await wait(80);
    expect(host.events).toHaveLength(1);
  });

  it('accumulates records from multiple batches into one event', async () => {
    const { host, element } = setup({ debounce: 40 });
    const observer = MockMutationObserver.last;
    observer.emitChildList(element);
    observer.emitChildList(element);
    observer.emitChildList(element);
    await wait(80);
    expect(host.events).toHaveLength(1);
    expect(host.events[0].records).toHaveLength(3);
  });

  it('normalizes a negative debounce to zero (synchronous)', () => {
    const { host, element } = setup({ debounce: -50 });
    MockMutationObserver.last.emitChildList(element);
    expect(host.events).toHaveLength(1);
  });

  it('normalizes NaN debounce to zero (synchronous)', () => {
    const { host, element } = setup({ debounce: Number.NaN });
    MockMutationObserver.last.emitChildList(element);
    expect(host.events).toHaveLength(1);
  });

  it('reacts to a debounce value changed at runtime', async () => {
    const { fixture, host, element } = setup({ debounce: 0 });
    host.debounce = 40;
    fixture.detectChanges();
    MockMutationObserver.last.emitChildList(element);
    expect(host.events).toHaveLength(0);
    await wait(80);
    expect(host.events).toHaveLength(1);
  });
});

describe('destruction', () => {
  it('disconnects the observer on destroy', () => {
    const { fixture } = setup();
    const observer = MockMutationObserver.last;
    fixture.destroy();
    expect(observer.disconnected).toBe(true);
    expect(observer.disconnectCount).toBe(1);
  });

  it('does not emit after destroy', () => {
    const { fixture, host, element } = setup();
    const observer = MockMutationObserver.last;
    fixture.destroy();
    observer.emitChildList(element);
    expect(host.events).toHaveLength(0);
  });

  it('is safe to destroy when the observer was never created', () => {
    const { fixture } = setup({}, SERVER);
    expect(() => fixture.destroy()).not.toThrow();
  });
});

describe('input behavior', () => {
  it('re-observes when an input changes at runtime', () => {
    const { fixture, element } = setup({ attributes: false });
    const first = MockMutationObserver.last;
    fixture.componentInstance.attributes = true;
    fixture.detectChanges();
    const next = MockMutationObserver.last;
    expect(next).not.toBe(first);
    expect(first.disconnected).toBe(true);
    expect(next.isObserving(element)).toBe(true);
    expect(next.init?.attributes).toBe(true);
  });

  it('exposes inputs under the documented aliases', () => {
    const { fixture } = setup({ subtree: true, debounce: 42 });
    const directive = fixture.debugElement
      .query(By.directive(MutationObserverDirective))
      .injector.get(MutationObserverDirective);
    expect(directive.mutationSubtree()).toBe(true);
    expect(directive.mutationDebounce()).toBe(42);
  });

  it('passes an attribute filter through', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [FilterHostComponent] });
    const fixture = TestBed.createComponent(FilterHostComponent);
    fixture.detectChanges();
    expect(MockMutationObserver.last.init?.attributeFilter).toEqual([
      'class',
      'style',
    ]);
  });
});

@Component({
  selector: 'dg-filter-host',
  standalone: true,
  imports: [MutationObserverDirective],
  template: `<div
    dgMutationObserver
    [mutationAttributes]="true"
    [mutationAttributeFilter]="['class', 'style']"
  ></div>`,
})
class FilterHostComponent {}

describe('browser and SSR behavior', () => {
  it('creates no observer on the server platform', () => {
    setup({}, SERVER);
    expect(MockMutationObserver.instances).toHaveLength(0);
  });

  it('handles an unsupported MutationObserver gracefully', () => {
    const remove = removeMutationObserver();
    try {
      const { host, element } = setup();
      expect(MockMutationObserver.instances).toHaveLength(0);
      expect(host.events).toHaveLength(0);
      expect(element).toBeTruthy();
    } finally {
      remove();
    }
  });

  it('warns in dev mode when MutationObserver is unavailable', () => {
    const remove = removeMutationObserver();
    try {
      const messages = captureWarnings(() => setup());
      expect(messages.length).toBe(1);
      expect(messages[0]).toContain('MutationObserver');
    } finally {
      remove();
    }
  });

  it('does not warn on the server platform', () => {
    const remove = removeMutationObserver();
    try {
      const messages = captureWarnings(() => setup({}, SERVER));
      expect(messages).toHaveLength(0);
    } finally {
      remove();
    }
  });
});
