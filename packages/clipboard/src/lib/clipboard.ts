import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, inject, PLATFORM_ID, signal } from '@angular/core';

import type {
  DgClipboardOptions,
  DgClipboardRef,
  DgClipboardStatus,
} from './clipboard.types';

/** Whether the async Clipboard API is usable right now. */
export function isClipboardApiAvailable(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.clipboard?.writeText === 'function'
  );
}

/** Whether the legacy `execCommand('copy')` fallback is usable. */
export function isExecCommandAvailable(): boolean {
  return (
    typeof document !== 'undefined' &&
    typeof (document as { execCommand?: unknown }).execCommand === 'function'
  );
}

/**
 * Copy via a temporary off-screen textarea + `document.execCommand('copy')`.
 *
 * Needed for insecure contexts (plain http) and older browsers, where
 * `navigator.clipboard` is unavailable. The element is always removed, even if
 * the command throws.
 */
export function copyWithExecCommand(value: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = value;
  // Keep it out of view and out of the tab order, and avoid scroll jumps.
  textarea.setAttribute('readonly', '');
  textarea.setAttribute('aria-hidden', 'true');
  textarea.style.position = 'fixed';
  textarea.style.top = '-9999px';
  textarea.style.opacity = '0';

  document.body.appendChild(textarea);
  try {
    textarea.select();
    textarea.setSelectionRange(0, value.length);
    return document.execCommand('copy');
  } finally {
    textarea.remove();
  }
}

/**
 * Inject a signal-based clipboard helper.
 *
 * ```ts
 * const clipboard = injectClipboard();
 *
 * await clipboard.copy('value');
 *
 * clipboard.status(); // 'idle' | 'copying' | 'copied' | 'failed'
 * clipboard.error();
 * ```
 *
 * SSR-safe: on the server `isSupported()` is `false` and `copy()` resolves
 * `false` without touching any browser global. Must be called from an injection
 * context — a pending status-reset timer is cleared on destroy.
 */
export function injectClipboard(
  options: DgClipboardOptions = {},
): DgClipboardRef {
  const { resetAfter = 2000, fallback = true } = options;

  const destroyRef = inject(DestroyRef);
  const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  const status = signal<DgClipboardStatus>('idle');
  const error = signal<unknown>(undefined);
  const copied = signal<string | undefined>(undefined);

  const supported =
    isBrowser &&
    (isClipboardApiAvailable() || (fallback && isExecCommandAvailable()));
  const isSupported = signal(supported);

  let resetTimer: ReturnType<typeof setTimeout> | undefined;
  let destroyed = false;

  function clearTimer(): void {
    if (resetTimer !== undefined) {
      clearTimeout(resetTimer);
      resetTimer = undefined;
    }
  }

  function scheduleReset(): void {
    if (resetAfter <= 0 || !Number.isFinite(resetAfter)) {
      return;
    }
    clearTimer();
    resetTimer = setTimeout(() => {
      resetTimer = undefined;
      if (!destroyed) {
        status.set('idle');
        error.set(undefined);
      }
    }, resetAfter);
  }

  function reset(): void {
    clearTimer();
    status.set('idle');
    error.set(undefined);
  }

  async function copy(value: string): Promise<boolean> {
    if (!supported) {
      status.set('failed');
      error.set(new Error('Clipboard is not available in this environment.'));
      scheduleReset();
      return false;
    }

    clearTimer();
    status.set('copying');
    error.set(undefined);

    try {
      if (isClipboardApiAvailable()) {
        await navigator.clipboard.writeText(value);
      } else if (!(fallback && copyWithExecCommand(value))) {
        throw new Error('Copy command was rejected by the browser.');
      }

      // The host may have been destroyed while the promise was in flight.
      if (destroyed) {
        return true;
      }

      copied.set(value);
      status.set('copied');
      scheduleReset();
      return true;
    } catch (cause: unknown) {
      if (destroyed) {
        return false;
      }
      error.set(cause);
      status.set('failed');
      scheduleReset();
      return false;
    }
  }

  destroyRef.onDestroy(() => {
    destroyed = true;
    clearTimer();
  });

  return {
    copy,
    status: status.asReadonly(),
    error: error.asReadonly(),
    copied: copied.asReadonly(),
    isSupported: isSupported.asReadonly(),
    reset,
  };
}
