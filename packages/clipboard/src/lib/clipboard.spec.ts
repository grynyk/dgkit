import { PLATFORM_ID, type Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { injectClipboard } from './clipboard';
import type { DgClipboardOptions, DgClipboardRef } from './clipboard.types';

const SERVER: Provider[] = [{ provide: PLATFORM_ID, useValue: 'server' }];

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

interface ClipboardStub {
  readonly writes: string[];
  rejectWith?: Error;
}

let stub: ClipboardStub;
let originalClipboard: PropertyDescriptor | undefined;
let originalExecCommand: unknown;

/** Install a fake `navigator.clipboard.writeText`. */
function installClipboardApi(): void {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: (value: string): Promise<void> => {
        if (stub.rejectWith !== undefined) {
          return Promise.reject(stub.rejectWith);
        }
        stub.writes.push(value);
        return Promise.resolve();
      },
    },
  });
}

/** Remove `navigator.clipboard` to force the fallback path. */
function removeClipboardApi(): void {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: undefined,
  });
}

function installExecCommand(result: boolean, throws = false): void {
  (document as unknown as { execCommand: unknown }).execCommand =
    (): boolean => {
      if (throws) {
        throw new Error('execCommand blew up');
      }
      // The helper appends its temporary textarea before calling execCommand
      // and removes it afterwards, so it is the last one in the DOM right now.
      // (jsdom's `select()` does not update `document.activeElement`.)
      const areas = document.querySelectorAll('textarea');
      const last = areas[areas.length - 1] as HTMLTextAreaElement | undefined;
      if (last) {
        stub.writes.push(last.value);
      }
      return result;
    };
}

function removeExecCommand(): void {
  delete (document as unknown as { execCommand?: unknown }).execCommand;
}

function make(
  options: DgClipboardOptions = {},
  providers: Provider[] = [],
): DgClipboardRef {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers });
  return TestBed.runInInjectionContext(() => injectClipboard(options));
}

beforeEach(() => {
  stub = { writes: [] };
  originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  originalExecCommand = (document as unknown as { execCommand?: unknown })
    .execCommand;
  installClipboardApi();
});

afterEach(() => {
  if (originalClipboard) {
    Object.defineProperty(navigator, 'clipboard', originalClipboard);
  } else {
    delete (navigator as unknown as { clipboard?: unknown }).clipboard;
  }
  if (originalExecCommand === undefined) {
    removeExecCommand();
  } else {
    (document as unknown as { execCommand: unknown }).execCommand =
      originalExecCommand;
  }
  TestBed.resetTestingModule();
});

describe('injectClipboard — happy path', () => {
  it('starts idle', () => {
    const clipboard = make();
    expect(clipboard.status()).toBe('idle');
    expect(clipboard.error()).toBeUndefined();
    expect(clipboard.copied()).toBeUndefined();
  });

  it('reports support when the Clipboard API exists', () => {
    expect(make().isSupported()).toBe(true);
  });

  it('copies via the async Clipboard API', async () => {
    const clipboard = make({ resetAfter: 0 });
    await expect(clipboard.copy('hello')).resolves.toBe(true);
    expect(stub.writes).toEqual(['hello']);
    expect(clipboard.status()).toBe('copied');
    expect(clipboard.copied()).toBe('hello');
    expect(clipboard.error()).toBeUndefined();
  });

  it('exposes a copying status while in flight', async () => {
    const clipboard = make({ resetAfter: 0 });
    const pending = clipboard.copy('x');
    expect(clipboard.status()).toBe('copying');
    await pending;
    expect(clipboard.status()).toBe('copied');
  });

  it('tracks the most recent copied value', async () => {
    const clipboard = make({ resetAfter: 0 });
    await clipboard.copy('first');
    await clipboard.copy('second');
    expect(clipboard.copied()).toBe('second');
  });
});

describe('injectClipboard — failures', () => {
  it('reports a rejected write as failed and keeps the error', async () => {
    const boom = new Error('denied');
    stub.rejectWith = boom;
    const clipboard = make({ resetAfter: 0 });
    await expect(clipboard.copy('x')).resolves.toBe(false);
    expect(clipboard.status()).toBe('failed');
    expect(clipboard.error()).toBe(boom);
    expect(clipboard.copied()).toBeUndefined();
  });

  it('clears a previous error on the next attempt', async () => {
    stub.rejectWith = new Error('denied');
    const clipboard = make({ resetAfter: 0 });
    await clipboard.copy('x');
    expect(clipboard.error()).toBeDefined();

    stub.rejectWith = undefined;
    await clipboard.copy('y');
    expect(clipboard.status()).toBe('copied');
    expect(clipboard.error()).toBeUndefined();
  });

  it('fails gracefully when nothing is supported', async () => {
    removeClipboardApi();
    removeExecCommand();
    const clipboard = make({ resetAfter: 0 });
    expect(clipboard.isSupported()).toBe(false);
    await expect(clipboard.copy('x')).resolves.toBe(false);
    expect(clipboard.status()).toBe('failed');
    expect(clipboard.error()).toBeInstanceOf(Error);
  });
});

describe('injectClipboard — execCommand fallback', () => {
  it('falls back to execCommand when the Clipboard API is missing', async () => {
    removeClipboardApi();
    installExecCommand(true);
    const clipboard = make({ resetAfter: 0 });
    expect(clipboard.isSupported()).toBe(true);
    await expect(clipboard.copy('legacy')).resolves.toBe(true);
    expect(stub.writes).toEqual(['legacy']);
    expect(clipboard.status()).toBe('copied');
  });

  it('falls back to execCommand when the async API rejects', async () => {
    // API present but rejects (e.g. document not focused); fallback available.
    stub.rejectWith = new Error('NotAllowedError');
    installExecCommand(true);
    const clipboard = make({ resetAfter: 0 });
    await expect(clipboard.copy('recover')).resolves.toBe(true);
    expect(clipboard.status()).toBe('copied');
    expect(stub.writes).toContain('recover'); // written via the textarea path
  });

  it('surfaces the async rejection when the fallback is disabled', async () => {
    stub.rejectWith = new Error('NotAllowedError');
    installExecCommand(true);
    const clipboard = make({ resetAfter: 0, fallback: false });
    await expect(clipboard.copy('x')).resolves.toBe(false);
    expect(clipboard.status()).toBe('failed');
    expect(clipboard.error()).toBeInstanceOf(Error);
  });

  it('treats a rejected execCommand as a failure', async () => {
    removeClipboardApi();
    installExecCommand(false);
    const clipboard = make({ resetAfter: 0 });
    await expect(clipboard.copy('legacy')).resolves.toBe(false);
    expect(clipboard.status()).toBe('failed');
  });

  it('removes the temporary textarea even when execCommand throws', async () => {
    removeClipboardApi();
    installExecCommand(true, true);
    const before = document.querySelectorAll('textarea').length;
    const clipboard = make({ resetAfter: 0 });
    await expect(clipboard.copy('legacy')).resolves.toBe(false);
    expect(document.querySelectorAll('textarea').length).toBe(before);
    expect(clipboard.status()).toBe('failed');
  });

  it('can disable the fallback entirely', async () => {
    removeClipboardApi();
    installExecCommand(true);
    const clipboard = make({ resetAfter: 0, fallback: false });
    expect(clipboard.isSupported()).toBe(false);
    await expect(clipboard.copy('x')).resolves.toBe(false);
  });
});

describe('injectClipboard — status reset', () => {
  it('reverts to idle after resetAfter', async () => {
    const clipboard = make({ resetAfter: 30 });
    await clipboard.copy('x');
    expect(clipboard.status()).toBe('copied');
    await wait(60);
    expect(clipboard.status()).toBe('idle');
  });

  it('does not auto-reset when resetAfter is 0', async () => {
    const clipboard = make({ resetAfter: 0 });
    await clipboard.copy('x');
    await wait(30);
    expect(clipboard.status()).toBe('copied');
  });

  it('reset() clears status and error immediately', async () => {
    stub.rejectWith = new Error('denied');
    const clipboard = make({ resetAfter: 0 });
    await clipboard.copy('x');
    expect(clipboard.status()).toBe('failed');
    clipboard.reset();
    expect(clipboard.status()).toBe('idle');
    expect(clipboard.error()).toBeUndefined();
  });

  it('ignores a non-finite resetAfter', async () => {
    const clipboard = make({ resetAfter: Number.POSITIVE_INFINITY });
    await clipboard.copy('x');
    await wait(20);
    expect(clipboard.status()).toBe('copied');
  });
});

describe('injectClipboard — SSR and teardown', () => {
  it('is SSR-safe', async () => {
    const clipboard = make({ resetAfter: 0 }, SERVER);
    expect(clipboard.isSupported()).toBe(false);
    await expect(clipboard.copy('x')).resolves.toBe(false);
    expect(stub.writes).toHaveLength(0);
  });

  it('does not commit a successful copy after the host is destroyed', async () => {
    const clipboard = make({ resetAfter: 10 });
    const pending = clipboard.copy('x');
    expect(clipboard.status()).toBe('copying');
    TestBed.resetTestingModule(); // destroys the injector mid-flight
    await expect(pending).resolves.toBe(true);
    // The success was swallowed: no state written into a destroyed host.
    expect(clipboard.status()).toBe('copying');
    expect(clipboard.copied()).toBeUndefined();
    await wait(30);
    expect(clipboard.status()).toBe('copying'); // no reset timer fired either
  });

  it('does not commit a failed copy after the host is destroyed', async () => {
    stub.rejectWith = new Error('denied');
    const clipboard = make({ resetAfter: 10 });
    const pending = clipboard.copy('x');
    TestBed.resetTestingModule();
    await expect(pending).resolves.toBe(false);
    expect(clipboard.status()).toBe('copying');
    expect(clipboard.error()).toBeUndefined();
  });

  it('clears a pending reset timer on destroy', async () => {
    const clipboard = make({ resetAfter: 20 });
    await clipboard.copy('x');
    expect(clipboard.status()).toBe('copied');
    TestBed.resetTestingModule();
    await wait(50);
    // The timer was cleared, so the status never flipped back to idle.
    expect(clipboard.status()).toBe('copied');
  });
});
