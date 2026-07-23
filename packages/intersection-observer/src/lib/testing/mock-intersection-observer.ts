/**
 * A framework-agnostic `IntersectionObserver` test double: observe/unobserve/
 * disconnect, option inspection, and manual triggering of one or many entries.
 */

export interface MockIntersectInit {
  readonly target: Element;
  readonly isIntersecting?: boolean;
  readonly intersectionRatio?: number;
}

/** Build a plausible `IntersectionObserverEntry`. */
export function makeIntersectionEntry(
  init: MockIntersectInit,
): IntersectionObserverEntry {
  const isIntersecting = init.isIntersecting ?? true;
  const ratio = init.intersectionRatio ?? (isIntersecting ? 1 : 0);
  const rect: DOMRectReadOnly = {
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    toJSON: () => ({}),
  };
  return {
    target: init.target,
    isIntersecting,
    intersectionRatio: ratio,
    boundingClientRect: rect,
    intersectionRect: rect,
    rootBounds: rect,
    time: 0,
  };
}

export class MockIntersectionObserver implements IntersectionObserver {
  static readonly instances: MockIntersectionObserver[] = [];

  static get last(): MockIntersectionObserver {
    const instance =
      MockIntersectionObserver.instances[
        MockIntersectionObserver.instances.length - 1
      ];
    if (!instance) {
      throw new Error('No MockIntersectionObserver instance created yet.');
    }
    return instance;
  }

  static reset(): void {
    MockIntersectionObserver.instances.length = 0;
  }

  readonly callback: IntersectionObserverCallback;
  readonly root: Element | Document | null;
  readonly rootMargin: string;
  readonly thresholds: readonly number[];
  readonly observed = new Set<Element>();
  disconnected = false;
  disconnectCount = 0;

  constructor(
    callback: IntersectionObserverCallback,
    options: IntersectionObserverInit = {},
  ) {
    this.callback = callback;
    this.root = options.root ?? null;
    this.rootMargin = options.rootMargin ?? '0px';
    const t = options.threshold ?? 0;
    this.thresholds = Array.isArray(t) ? t : [t];
    MockIntersectionObserver.instances.push(this);
  }

  observe(target: Element): void {
    this.observed.add(target);
  }

  unobserve(target: Element): void {
    this.observed.delete(target);
  }

  disconnect(): void {
    this.observed.clear();
    this.disconnected = true;
    this.disconnectCount += 1;
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  isObserving(target: Element): boolean {
    return this.observed.has(target);
  }

  get observedElements(): Element[] {
    return [...this.observed];
  }

  emit(entries: IntersectionObserverEntry[]): void {
    this.callback(entries, this);
  }

  /** Convenience: fire a single entry for `target`. */
  emitState(
    target: Element,
    isIntersecting: boolean,
    intersectionRatio?: number,
  ): IntersectionObserverEntry {
    const entry = makeIntersectionEntry({
      target,
      isIntersecting,
      intersectionRatio,
    });
    this.emit([entry]);
    return entry;
  }
}

export function installMockIntersectionObserver(): () => void {
  const scope = globalThis as {
    IntersectionObserver?: typeof IntersectionObserver;
  };
  const original = scope.IntersectionObserver;
  MockIntersectionObserver.reset();
  scope.IntersectionObserver = MockIntersectionObserver;
  return () => {
    if (original === undefined) {
      delete scope.IntersectionObserver;
    } else {
      scope.IntersectionObserver = original;
    }
  };
}

export function removeIntersectionObserver(): () => void {
  const scope = globalThis as {
    IntersectionObserver?: typeof IntersectionObserver;
  };
  const original = scope.IntersectionObserver;
  delete scope.IntersectionObserver;
  return () => {
    if (original !== undefined) {
      scope.IntersectionObserver = original;
    }
  };
}
