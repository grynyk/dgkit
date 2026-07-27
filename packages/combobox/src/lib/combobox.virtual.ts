import type { DgComboboxRow, DgComboboxVirtualWindow } from './combobox.types';

/** Inputs to {@link computeVirtualWindow}. */
export interface DgVirtualWindowInput<T> {
  readonly rows: readonly DgComboboxRow<T>[];
  readonly rowHeight: number;
  readonly viewportHeight: number;
  readonly scrollTop: number;
  readonly overscan: number;
}

/**
 * Compute the slice of rows visible for a fixed-height virtual list.
 *
 * When `rowHeight` or `viewportHeight` is not a usable positive number
 * virtualization is disabled and every row is returned — the safe default
 * before a viewport has been measured, or when no `virtual` config was given.
 */
export function computeVirtualWindow<T>(
  input: DgVirtualWindowInput<T>,
): DgComboboxVirtualWindow<T> {
  const { rows, rowHeight, viewportHeight, scrollTop, overscan } = input;
  const count = rows.length;

  if (!(rowHeight > 0) || !(viewportHeight > 0)) {
    return {
      totalHeight: count * Math.max(0, rowHeight),
      offsetY: 0,
      startIndex: 0,
      endIndex: count,
      rows,
    };
  }

  const safeScrollTop = scrollTop > 0 ? scrollTop : 0;
  const safeOverscan = overscan > 0 ? Math.floor(overscan) : 0;
  const firstVisible = Math.floor(safeScrollTop / rowHeight);
  const visibleCount = Math.ceil(viewportHeight / rowHeight);

  const startIndex = Math.max(0, firstVisible - safeOverscan);
  const endIndex = Math.min(count, firstVisible + visibleCount + safeOverscan);

  return {
    totalHeight: count * rowHeight,
    offsetY: startIndex * rowHeight,
    startIndex,
    endIndex,
    rows: rows.slice(startIndex, endIndex),
  };
}
