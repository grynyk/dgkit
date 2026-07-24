/**
 * Whether triggering a browser download is possible in this environment.
 *
 * `false` under SSR/Node and in any environment missing `document` or
 * `URL.createObjectURL`.
 */
export function isDownloadSupported(): boolean {
  return (
    typeof document !== 'undefined' &&
    typeof URL !== 'undefined' &&
    typeof URL.createObjectURL === 'function'
  );
}

/**
 * Trigger a browser download of `blob`, saved as `filename`.
 *
 * ```ts
 * const csv = new Blob([content], { type: 'text/csv' });
 * downloadBlob('report.csv', csv);
 * ```
 *
 * Creates a temporary object URL and an off-screen `<a download>`, clicks it,
 * then removes the element and revokes the URL. The revoke is deferred to a
 * macrotask so the browser has already started the download by the time the
 * URL is released — calling `URL.revokeObjectURL` synchronously after
 * `click()` is a common source of downloads silently failing.
 *
 * Throws if called where downloads aren't possible (see
 * {@link isDownloadSupported}) — this is an imperative, user-triggered
 * action with no meaningful non-browser behavior, unlike this package's
 * SSR-safe Angular counterparts.
 */
export function downloadBlob(filename: string, blob: Blob): void {
  if (!isDownloadSupported()) {
    throw new Error(
      '[downloadBlob] Downloads are not supported in this environment.',
    );
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  link.style.display = 'none';

  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
