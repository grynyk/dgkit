import { signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { signalHistory } from './signal-history';
import type {
  DgSignalHistory,
  DgSignalHistoryOptions,
} from './signal-history.types';

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Flush pending effects so the watcher observes the latest source value. */
function flush(): void {
  TestBed.tick();
}

function make<T>(
  initial: T,
  options: DgSignalHistoryOptions<T> = {},
): { source: WritableSignal<T>; history: DgSignalHistory<T> } {
  const source = signal(initial);
  const history = TestBed.runInInjectionContext(() =>
    signalHistory(source, options),
  );
  flush(); // settle the initial value
  return { source, history };
}

/** Change the source and let the watcher record it. */
function change<T>(source: WritableSignal<T>, value: T): void {
  source.set(value);
  flush();
}

beforeEach(() => {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({});
});

afterEach(() => {
  TestBed.resetTestingModule();
});

describe('signalHistory — basics', () => {
  it('starts with no history', () => {
    const { history } = make(0);
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(false);
    expect(history.past()).toEqual([]);
    expect(history.future()).toEqual([]);
  });

  it('records changes and undoes them', () => {
    const { source, history } = make(0);
    change(source, 1);
    change(source, 2);
    expect(history.canUndo()).toBe(true);
    expect(history.past()).toEqual([0, 1]);

    history.undo();
    expect(source()).toBe(1);
    history.undo();
    expect(source()).toBe(0);
    expect(history.canUndo()).toBe(false);
  });

  it('redoes undone changes', () => {
    const { source, history } = make(0);
    change(source, 1);
    change(source, 2);

    history.undo();
    history.undo();
    expect(source()).toBe(0);
    expect(history.canRedo()).toBe(true);

    history.redo();
    expect(source()).toBe(1);
    history.redo();
    expect(source()).toBe(2);
    expect(history.canRedo()).toBe(false);
  });

  it('does not re-record an undo as a new change', () => {
    const { source, history } = make(0);
    change(source, 1);
    history.undo();
    flush(); // the undo write must not be recorded
    expect(source()).toBe(0);
    expect(history.past()).toEqual([]);
    expect(history.future()).toEqual([1]);
  });

  it('clears the redo stack on a new change', () => {
    const { source, history } = make(0);
    change(source, 1);
    history.undo();
    expect(history.canRedo()).toBe(true);

    change(source, 99);
    expect(history.canRedo()).toBe(false);
    expect(history.future()).toEqual([]);
  });

  it('undo/redo are no-ops when there is nothing to do', () => {
    const { source, history } = make(5);
    expect(() => history.undo()).not.toThrow();
    expect(() => history.redo()).not.toThrow();
    expect(source()).toBe(5);
  });

  it('ignores writes of an equal value', () => {
    const { source, history } = make(1);
    change(source, 1);
    expect(history.canUndo()).toBe(false);
  });

  it('honours a custom equality function', () => {
    const { source, history } = make(
      { id: 1 },
      { equal: (a, b) => a.id === b.id },
    );
    change(source, { id: 1 }); // structurally equal → ignored
    expect(history.canUndo()).toBe(false);
    change(source, { id: 2 });
    expect(history.canUndo()).toBe(true);
  });
});

describe('signalHistory — limit', () => {
  it('drops the oldest entries beyond the limit', () => {
    const { source, history } = make(0, { limit: 3 });
    for (let i = 1; i <= 6; i++) {
      change(source, i);
    }
    expect(history.past()).toHaveLength(3);
    expect(history.past()).toEqual([3, 4, 5]);
  });

  it('treats limit 0 as unlimited', () => {
    const { source, history } = make(0, { limit: 0 });
    for (let i = 1; i <= 10; i++) {
      change(source, i);
    }
    expect(history.past()).toHaveLength(10);
  });
});

describe('signalHistory — transactions', () => {
  it('collapses grouped changes into one entry', () => {
    const { source, history } = make(0);
    history.transaction(() => {
      source.set(1);
      source.set(2);
      source.set(3);
    });
    flush();
    expect(source()).toBe(3);
    expect(history.past()).toEqual([0]);

    history.undo();
    expect(source()).toBe(0);
  });

  it('records nothing when a transaction makes no net change', () => {
    const { source, history } = make(7);
    history.transaction(() => {
      source.set(8);
      source.set(7);
    });
    flush();
    expect(history.canUndo()).toBe(false);
  });

  it('supports nested transactions as a single entry', () => {
    const { source, history } = make(0);
    history.transaction(() => {
      source.set(1);
      history.transaction(() => {
        source.set(2);
      });
      source.set(3);
    });
    flush();
    expect(history.past()).toEqual([0]);
  });

  it('restores the depth even if the work throws', () => {
    const { source, history } = make(0);
    expect(() =>
      history.transaction(() => {
        source.set(1);
        throw new Error('boom');
      }),
    ).toThrow('boom');
    flush();
    // The partial change is still recorded as one entry.
    expect(history.past()).toEqual([0]);

    change(source, 2);
    expect(history.past()).toEqual([0, 1]);
  });
});

describe('signalHistory — debounce', () => {
  it('coalesces rapid changes into one entry', async () => {
    const { source, history } = make(0, { debounce: 40 });
    change(source, 1);
    change(source, 2);
    change(source, 3);
    expect(history.past()).toEqual([0]);

    await wait(80);
    change(source, 4);
    expect(history.past()).toEqual([0, 3]);
  });

  it('undo after a coalesced burst returns to the pre-burst value', async () => {
    const { source, history } = make(0, { debounce: 40 });
    change(source, 1);
    change(source, 2);
    await wait(80);

    history.undo();
    expect(source()).toBe(0);
  });

  it('records every change when debounce is 0', () => {
    const { source, history } = make(0, { debounce: 0 });
    change(source, 1);
    change(source, 2);
    expect(history.past()).toEqual([0, 1]);
  });
});

describe('signalHistory — reset', () => {
  it('clears history but keeps the current value', () => {
    const { source, history } = make(0);
    change(source, 1);
    change(source, 2);
    history.reset();
    expect(source()).toBe(2);
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(false);
  });

  it('resets to a supplied value', () => {
    const { source, history } = make(0);
    change(source, 1);
    history.reset(42);
    flush();
    expect(source()).toBe(42);
    expect(history.past()).toEqual([]);
    // The reset write itself is not recorded.
    expect(history.canUndo()).toBe(false);
  });

  it('keeps recording after a reset', () => {
    const { source, history } = make(0);
    change(source, 1);
    history.reset();
    change(source, 2);
    expect(history.past()).toEqual([1]);
  });
});

describe('signalHistory — teardown', () => {
  it('stops recording after destroy()', () => {
    const { source, history } = make(0);
    history.destroy();
    change(source, 1);
    expect(history.past()).toEqual([]);
  });

  it('destroy() is idempotent', () => {
    const { history } = make(0);
    history.destroy();
    expect(() => history.destroy()).not.toThrow();
  });

  it('stops recording when the injection context is destroyed', () => {
    const { source, history } = make(0);
    TestBed.resetTestingModule();
    source.set(1);
    expect(history.past()).toEqual([]);
  });
});
