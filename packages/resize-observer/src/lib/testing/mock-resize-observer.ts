/**
 * A small, framework-agnostic `ResizeObserver` test double.
 *
 * It is shared by both the Jest and Vitest suites and supports everything the
 * directive tests need: observing/unobserving/disconnecting, inspecting the
 * observed elements and their options, and manually triggering one or many
 * entries. It also lets a test simulate an environment where `ResizeObserver`
 * does not exist at all.
 */

interface Size {
  readonly inlineSize: number;
  readonly blockSize: number;
}

export interface MockEntryInit {
  readonly target: Element;
  readonly width?: number;
  readonly height?: number;
  readonly box?: 'content-box' | 'border-box' | 'device-pixel-content-box';
}

/** Build a realistic `ResizeObserverEntry` for a given element and size. */
export function makeEntry(init: MockEntryInit): ResizeObserverEntry {
  const width = init.width ?? 0;
  const height = init.height ?? 0;
  const size: Size[] = [{ inlineSize: width, blockSize: height }];
  const contentRect: DOMRectReadOnly = {
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: width,
    bottom: height,
    width,
    height,
    toJSON: () => ({ width, height }),
  };
  return {
    target: init.target,
    contentRect,
    borderBoxSize: size,
    contentBoxSize: size,
    devicePixelContentBoxSize: size,
  };
}

export class MockResizeObserver implements ResizeObserver {
  /** Every instance created since the last {@link MockResizeObserver.reset}. */
  static readonly instances: MockResizeObserver[] = [];

  /** If set, `observe` throws when called with this box (to test fallbacks). */
  static throwOnBox: string | undefined = undefined;

  static get last(): MockResizeObserver {
    const instance =
      MockResizeObserver.instances[MockResizeObserver.instances.length - 1];
    if (!instance) {
      throw new Error('No MockResizeObserver instance has been created yet.');
    }
    return instance;
  }

  static reset(): void {
    MockResizeObserver.instances.length = 0;
    MockResizeObserver.throwOnBox = undefined;
  }

  readonly callback: ResizeObserverCallback;
  readonly observed = new Map<Element, ResizeObserverOptions | undefined>();
  disconnected = false;
  disconnectCount = 0;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    MockResizeObserver.instances.push(this);
  }

  observe(target: Element, options?: ResizeObserverOptions): void {
    if (
      MockResizeObserver.throwOnBox !== undefined &&
      options?.box === MockResizeObserver.throwOnBox
    ) {
      throw new Error(`Unsupported box option: ${options.box}`);
    }
    this.observed.set(target, options);
  }

  unobserve(target: Element): void {
    this.observed.delete(target);
  }

  disconnect(): void {
    this.observed.clear();
    this.disconnected = true;
    this.disconnectCount += 1;
  }

  // --- Inspection helpers -------------------------------------------------

  isObserving(target: Element): boolean {
    return this.observed.has(target);
  }

  optionsFor(target: Element): ResizeObserverOptions | undefined {
    return this.observed.get(target);
  }

  get observedElements(): Element[] {
    return [...this.observed.keys()];
  }

  // --- Triggering helpers -------------------------------------------------

  /** Fire the callback with a raw list of entries. */
  emit(entries: ResizeObserverEntry[]): void {
    this.callback(entries, this);
  }

  /** Convenience: fire a single entry for `target` with the given size. */
  emitSize(
    target: Element,
    width: number,
    height: number,
  ): ResizeObserverEntry {
    const entry = makeEntry({ target, width, height });
    this.emit([entry]);
    return entry;
  }
}

/**
 * Install {@link MockResizeObserver} as the global `ResizeObserver`.
 * Returns a restore function that puts the previous value back.
 */
export function installMockResizeObserver(): () => void {
  const scope = globalThis as { ResizeObserver?: typeof ResizeObserver };
  const original = scope.ResizeObserver;
  MockResizeObserver.reset();
  scope.ResizeObserver = MockResizeObserver;
  return () => {
    if (original === undefined) {
      delete scope.ResizeObserver;
    } else {
      scope.ResizeObserver = original;
    }
  };
}

/**
 * Remove `ResizeObserver` from the global scope to simulate an unsupported
 * browser or a server environment. Returns a restore function.
 */
export function removeResizeObserver(): () => void {
  const scope = globalThis as { ResizeObserver?: typeof ResizeObserver };
  const original = scope.ResizeObserver;
  delete scope.ResizeObserver;
  return () => {
    if (original !== undefined) {
      scope.ResizeObserver = original;
    }
  };
}
