import type { DgComboboxRow } from './combobox.types';

/**
 * How to read the parts of an option needed to build rows. A minimal, resolved
 * view of the relevant {@link DgComboboxOptions} accessors.
 */
export interface DgComboboxRowConfig<T> {
  readonly getValue: (option: T) => unknown;
  readonly getLabel: (option: T) => string;
  readonly getDisabled: (option: T) => boolean;
  readonly getGroup?: (option: T) => string | undefined;
}

/**
 * Default filter: case-insensitive substring match of the trimmed query
 * against the option label. An empty query matches everything.
 */
export function defaultMatch(label: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  return q === '' || label.toLowerCase().includes(q);
}

function optionRow<T>(
  option: T,
  index: number,
  group: string | undefined,
  config: DgComboboxRowConfig<T>,
  selectedValues: ReadonlySet<unknown>,
): DgComboboxRow<T> {
  return {
    type: 'option',
    index,
    group,
    option,
    selected: selectedValues.has(config.getValue(option)),
    disabled: config.getDisabled(option),
    active: false,
  };
}

/**
 * Flatten options into render-ready rows.
 *
 * Without a `getGroup` extractor the options are emitted in order. With one,
 * ungrouped options come first, followed by each group (a header row plus its
 * options) in first-seen order. Every row is stamped with its final flat index
 * so the same index space drives navigation and virtual scrolling. The
 * `active` flag is always `false` here; it is overlaid separately so changing
 * the highlight never re-filters or re-groups.
 */
export function buildRows<T>(
  options: readonly T[],
  config: DgComboboxRowConfig<T>,
  selectedValues: ReadonlySet<unknown>,
): DgComboboxRow<T>[] {
  const rows: DgComboboxRow<T>[] = [];

  if (!config.getGroup) {
    for (const option of options) {
      rows.push(optionRow(option, rows.length, undefined, config, selectedValues));
    }
    return rows;
  }

  const order: string[] = [];
  const byGroup = new Map<string, T[]>();
  const ungrouped: T[] = [];

  for (const option of options) {
    const group = config.getGroup(option);
    if (group == null || group === '') {
      ungrouped.push(option);
      continue;
    }
    let bucket = byGroup.get(group);
    if (!bucket) {
      bucket = [];
      byGroup.set(group, bucket);
      order.push(group);
    }
    bucket.push(option);
  }

  for (const option of ungrouped) {
    rows.push(optionRow(option, rows.length, undefined, config, selectedValues));
  }

  for (const group of order) {
    rows.push({
      type: 'group',
      index: rows.length,
      group,
      selected: false,
      disabled: false,
      active: false,
    });
    for (const option of byGroup.get(group)!) {
      rows.push(optionRow(option, rows.length, group, config, selectedValues));
    }
  }

  return rows;
}
