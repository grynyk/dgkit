import { describe, expect, it } from 'vitest';

import type { DgComboboxRow } from './combobox.types';
import { computeVirtualWindow } from './combobox.virtual';

function rows(count: number): DgComboboxRow<number>[] {
  return Array.from({ length: count }, (_, index) => ({
    type: 'option' as const,
    index,
    option: index,
    selected: false,
    disabled: false,
    active: false,
  }));
}

describe('computeVirtualWindow', () => {
  it('renders every row when rowHeight is not positive', () => {
    const all = rows(10);
    const window = computeVirtualWindow({
      rows: all,
      rowHeight: 0,
      viewportHeight: 200,
      scrollTop: 0,
      overscan: 2,
    });
    expect(window.rows).toBe(all);
    expect(window.startIndex).toBe(0);
    expect(window.endIndex).toBe(10);
    expect(window.totalHeight).toBe(0);
  });

  it('renders every row when the viewport has not been measured', () => {
    const all = rows(10);
    const window = computeVirtualWindow({
      rows: all,
      rowHeight: 20,
      viewportHeight: 0,
      scrollTop: 0,
      overscan: 2,
    });
    expect(window.rows).toHaveLength(10);
    expect(window.totalHeight).toBe(200);
  });

  it('windows rows around the scroll position with overscan', () => {
    const window = computeVirtualWindow({
      rows: rows(100),
      rowHeight: 20,
      viewportHeight: 100, // 5 rows visible
      scrollTop: 200, // first visible row = 10
      overscan: 2,
    });
    expect(window.startIndex).toBe(8); // 10 - 2 overscan
    expect(window.endIndex).toBe(17); // 10 + 5 + 2 overscan
    expect(window.offsetY).toBe(160); // 8 * 20
    expect(window.totalHeight).toBe(2000);
    expect(window.rows.map((r) => r.index)).toEqual([
      8, 9, 10, 11, 12, 13, 14, 15, 16,
    ]);
  });

  it('clamps the window to the row bounds', () => {
    const start = computeVirtualWindow({
      rows: rows(100),
      rowHeight: 20,
      viewportHeight: 100,
      scrollTop: 0,
      overscan: 4,
    });
    expect(start.startIndex).toBe(0);

    const end = computeVirtualWindow({
      rows: rows(100),
      rowHeight: 20,
      viewportHeight: 100,
      scrollTop: 100000,
      overscan: 4,
    });
    expect(end.endIndex).toBe(100);
  });

  it('treats a negative scrollTop as zero', () => {
    const window = computeVirtualWindow({
      rows: rows(100),
      rowHeight: 20,
      viewportHeight: 100,
      scrollTop: -50,
      overscan: 0,
    });
    expect(window.startIndex).toBe(0);
    expect(window.offsetY).toBe(0);
  });
});
