/** Options for {@link fileSize}. */
export interface FileSizeOptions {
  /**
   * Unit system:
   * - `'binary'` (default) — 1024-based with IEC units (KiB, MiB, …);
   * - `'decimal'` — 1000-based with SI units (kB, MB, …).
   */
  readonly standard?: 'binary' | 'decimal';
  /** Maximum number of fraction digits (default `1`). */
  readonly maximumFractionDigits?: number;
  /** Separator between the number and the unit (default `' '`). */
  readonly separator?: string;
  /**
   * BCP-47 locale (or locales) for the number formatting — controls the decimal
   * and grouping separators. Defaults to the host's locale. Pass e.g. `'en-US'`
   * for output that does not vary between environments.
   */
  readonly locale?: string | readonly string[];
}

const BINARY_UNITS = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB'] as const;
const DECIMAL_UNITS = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB'] as const;

/**
 * Format a byte count as a human-readable string.
 *
 * ```ts
 * fileSize(0);                          // '0 B'
 * fileSize(1536);                       // '1.5 KiB'
 * fileSize(1_500_000, { standard: 'decimal' }); // '1.5 MB'
 * ```
 *
 * Negative inputs keep their sign; `NaN`/non-finite inputs return `'0 B'`.
 */
export function fileSize(bytes: number, options: FileSizeOptions = {}): string {
  const {
    standard = 'binary',
    maximumFractionDigits = 1,
    separator = ' ',
    locale,
  } = options;

  if (!Number.isFinite(bytes)) {
    return `0${separator}B`;
  }

  const base = standard === 'decimal' ? 1000 : 1024;
  const units = standard === 'decimal' ? DECIMAL_UNITS : BINARY_UNITS;

  const sign = bytes < 0 ? '-' : '';
  let size = Math.abs(bytes);

  let unitIndex = 0;
  while (size >= base && unitIndex < units.length - 1) {
    size /= base;
    unitIndex += 1;
  }

  const formatted = size.toLocaleString(locale, {
    maximumFractionDigits: Math.max(0, Math.floor(maximumFractionDigits)),
  });

  return `${sign}${formatted}${separator}${units[unitIndex]}`;
}
