/**
 * A small, framework-agnostic `MutationObserver` test double.
 *
 * Supports everything the directive and signal-API tests need: observing/
 * disconnecting, inspecting the observed node and its init options, and
 * manually triggering one or many records. It also lets a test simulate an
 * environment where `MutationObserver` does not exist at all.
 */

export interface MockRecordInit {
  readonly target: Node;
  readonly type?: MutationRecordType;
  readonly addedNodes?: readonly Node[];
  readonly removedNodes?: readonly Node[];
  readonly attributeName?: string | null;
  readonly oldValue?: string | null;
}

/** Build a realistic `MutationRecord` for a given target. */
export function makeRecord(init: MockRecordInit): MutationRecord {
  return {
    type: init.type ?? 'childList',
    target: init.target,
    addedNodes: toNodeList(init.addedNodes ?? []),
    removedNodes: toNodeList(init.removedNodes ?? []),
    previousSibling: null,
    nextSibling: null,
    attributeName: init.attributeName ?? null,
    attributeNamespace: null,
    oldValue: init.oldValue ?? null,
  };
}

function toNodeList(nodes: readonly Node[]): NodeList {
  const fragment = document.createDocumentFragment();
  for (const node of nodes) {
    fragment.appendChild(node);
  }
  return fragment.childNodes;
}

export class MockMutationObserver implements MutationObserver {
  /** Every instance created since the last {@link MockMutationObserver.reset}. */
  static readonly instances: MockMutationObserver[] = [];

  static get last(): MockMutationObserver {
    const instance =
      MockMutationObserver.instances[MockMutationObserver.instances.length - 1];
    if (!instance) {
      throw new Error('No MockMutationObserver instance has been created yet.');
    }
    return instance;
  }

  static reset(): void {
    MockMutationObserver.instances.length = 0;
  }

  readonly callback: MutationCallback;
  target: Node | undefined;
  init: MutationObserverInit | undefined;
  disconnected = false;
  disconnectCount = 0;

  constructor(callback: MutationCallback) {
    this.callback = callback;
    MockMutationObserver.instances.push(this);
  }

  observe(target: Node, options?: MutationObserverInit): void {
    this.target = target;
    this.init = options;
    this.disconnected = false;
  }

  disconnect(): void {
    this.target = undefined;
    this.disconnected = true;
    this.disconnectCount += 1;
  }

  takeRecords(): MutationRecord[] {
    return [];
  }

  // --- Inspection helpers -------------------------------------------------

  isObserving(target: Node): boolean {
    return !this.disconnected && this.target === target;
  }

  // --- Triggering helpers -------------------------------------------------

  /** Fire the callback with a raw list of records. */
  emit(records: MutationRecord[]): void {
    this.callback(records, this);
  }

  /** Convenience: fire a single `childList` record for `target`. */
  emitChildList(target: Node): MutationRecord {
    const record = makeRecord({ target, type: 'childList' });
    this.emit([record]);
    return record;
  }
}

/**
 * Install {@link MockMutationObserver} as the global `MutationObserver`.
 * Returns a restore function that puts the previous value back.
 */
export function installMockMutationObserver(): () => void {
  const scope = globalThis as { MutationObserver?: typeof MutationObserver };
  const original = scope.MutationObserver;
  MockMutationObserver.reset();
  scope.MutationObserver = MockMutationObserver;
  return () => {
    if (original === undefined) {
      delete scope.MutationObserver;
    } else {
      scope.MutationObserver = original;
    }
  };
}

/**
 * Remove `MutationObserver` from the global scope to simulate an unsupported
 * browser or a server environment. Returns a restore function.
 */
export function removeMutationObserver(): () => void {
  const scope = globalThis as { MutationObserver?: typeof MutationObserver };
  const original = scope.MutationObserver;
  delete scope.MutationObserver;
  return () => {
    if (original !== undefined) {
      scope.MutationObserver = original;
    }
  };
}
