import { describe, expect, it } from 'vitest';

import {
  buildRows,
  defaultMatch,
  type DgComboboxRowConfig,
} from './combobox.utils';

interface City {
  readonly id: number;
  readonly name: string;
  readonly country?: string;
  readonly disabled?: boolean;
}

const cities: readonly City[] = [
  { id: 1, name: 'Kyiv', country: 'Ukraine' },
  { id: 2, name: 'Lviv', country: 'Ukraine', disabled: true },
  { id: 3, name: 'Berlin', country: 'Germany' },
  { id: 4, name: 'Nowhere' }, // ungrouped
];

const groupedConfig: DgComboboxRowConfig<City> = {
  getValue: (c) => c.id,
  getLabel: (c) => c.name,
  getDisabled: (c) => Boolean(c.disabled),
  getGroup: (c) => c.country,
};

const flatConfig: DgComboboxRowConfig<City> = {
  getValue: (c) => c.id,
  getLabel: (c) => c.name,
  getDisabled: (c) => Boolean(c.disabled),
};

describe('defaultMatch', () => {
  it('matches everything for an empty or whitespace query', () => {
    expect(defaultMatch('Kyiv', '')).toBe(true);
    expect(defaultMatch('Kyiv', '   ')).toBe(true);
  });

  it('is a case-insensitive, trimmed substring match', () => {
    expect(defaultMatch('Berlin', 'ERL')).toBe(true);
    expect(defaultMatch('Berlin', '  ber ')).toBe(true);
    expect(defaultMatch('Berlin', 'xyz')).toBe(false);
  });
});

describe('buildRows', () => {
  it('emits options in order when no group extractor is given', () => {
    const rows = buildRows(cities, flatConfig, new Set());
    expect(rows).toHaveLength(4);
    expect(rows.every((r) => r.type === 'option')).toBe(true);
    expect(rows.map((r) => r.index)).toEqual([0, 1, 2, 3]);
  });

  it('marks selected and disabled options', () => {
    const rows = buildRows(cities, flatConfig, new Set([1]));
    expect(rows[0].selected).toBe(true);
    expect(rows[1].disabled).toBe(true);
    expect(rows[2].selected).toBe(false);
  });

  it('places ungrouped options first, then groups in first-seen order', () => {
    const rows = buildRows(cities, groupedConfig, new Set());
    // Nowhere (ungrouped), then Ukraine header + 2, then Germany header + 1.
    expect(
      rows.map((r) => (r.type === 'group' ? `#${r.group}` : r.option?.name)),
    ).toEqual(['Nowhere', '#Ukraine', 'Kyiv', 'Lviv', '#Germany', 'Berlin']);
  });

  it('stamps sequential flat indices across headers and options', () => {
    const rows = buildRows(cities, groupedConfig, new Set());
    expect(rows.map((r) => r.index)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('carries the group label onto grouped option rows', () => {
    const rows = buildRows(cities, groupedConfig, new Set());
    const kyiv = rows.find((r) => r.option?.name === 'Kyiv');
    expect(kyiv?.group).toBe('Ukraine');
  });

  it('treats empty-string groups as ungrouped', () => {
    const config: DgComboboxRowConfig<City> = {
      ...groupedConfig,
      getGroup: () => '',
    };
    const rows = buildRows(cities, config, new Set());
    expect(rows.every((r) => r.type === 'option')).toBe(true);
  });

  it('returns an empty list for no options', () => {
    expect(buildRows([], groupedConfig, new Set())).toEqual([]);
  });
});
