import { computed, signal } from '@angular/core';

import type {
  DgComboboxOptions,
  DgComboboxRef,
  DgComboboxRow,
  DgValueOrAccessor,
} from './combobox.types';
import {
  buildRows,
  defaultMatch,
  type DgComboboxRowConfig,
} from './combobox.utils';
import { computeVirtualWindow } from './combobox.virtual';

function toAccessor<T>(value: DgValueOrAccessor<T>): () => T {
  return typeof value === 'function' ? (value as () => T) : () => value;
}

function nonNegative(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * Create a headless combobox controller.
 *
 * Owns every piece of state as signals — panel open, filter query, selection
 * (single or multiple), grouping, keyboard active-descendant and a fixed-height
 * virtual scroll window — while rendering nothing itself. The consumer supplies
 * the template, so option markup, group headers and layout are entirely theirs.
 *
 * ```ts
 * readonly cb = injectCombobox<City>({
 *   options: this.cities,
 *   optionLabel: (c) => c.name,
 *   optionGroup: (c) => c.country,
 *   multiple: true,
 *   virtual: { rowHeight: 32, viewportHeight: 240 },
 * });
 * ```
 *
 * Being pure signal state, it can be created in a component field, a service or
 * any other context — it does not require an injection context and needs no
 * teardown.
 */
export function injectCombobox<T>(
  options: DgComboboxOptions<T>,
): DgComboboxRef<T> {
  const optionsAccessor = toAccessor(options.options);
  const multipleAccessor = toAccessor(options.multiple ?? false);

  const getValue = options.optionValue ?? ((option: T): unknown => option);
  const getLabel =
    options.optionLabel ?? ((option: T): string => String(option));
  const getDisabled = options.optionDisabled ?? ((): boolean => false);
  const filterFn =
    options.filter ??
    ((option: T, query: string): boolean =>
      defaultMatch(getLabel(option), query));

  const rowConfig: DgComboboxRowConfig<T> = {
    getValue,
    getLabel,
    getDisabled,
    getGroup: options.optionGroup,
  };

  const rowHeight = options.virtual?.rowHeight ?? 0;
  const overscan = options.virtual?.overscan ?? 4;

  const openState = signal(false);
  const queryState = signal('');
  const selectedState = signal<readonly T[]>([]);
  const activeIndexState = signal(-1);
  const scrollTopState = signal(0);
  const viewportHeightState = signal(
    nonNegative(options.virtual?.viewportHeight ?? 0),
  );

  const multiple = computed(() => Boolean(multipleAccessor()));

  const selectedValues = computed(() => {
    const set = new Set<unknown>();
    for (const option of selectedState()) {
      set.add(getValue(option));
    }
    return set;
  });

  const filteredOptions = computed<readonly T[]>(() => {
    const all = optionsAccessor();
    const query = queryState();
    if (query.trim() === '') {
      return all;
    }
    return all.filter((option) => filterFn(option, query));
  });

  const baseRows = computed(() =>
    buildRows(filteredOptions(), rowConfig, selectedValues()),
  );

  const enabledIndexes = computed(() => {
    const indexes: number[] = [];
    for (const row of baseRows()) {
      if (row.type === 'option' && !row.disabled) {
        indexes.push(row.index);
      }
    }
    return indexes;
  });

  const optionCount = computed(() =>
    baseRows().reduce(
      (total, row) => total + (row.type === 'option' ? 1 : 0),
      0,
    ),
  );

  const rows = computed<readonly DgComboboxRow<T>[]>(() => {
    const active = activeIndexState();
    const base = baseRows();
    if (active < 0) {
      return base;
    }
    return base.map((row) =>
      row.index === active ? { ...row, active: true } : row,
    );
  });

  const activeOption = computed<T | undefined>(() => {
    const row = baseRows()[activeIndexState()];
    return row?.type === 'option' ? row.option : undefined;
  });

  const virtual = computed(() =>
    computeVirtualWindow({
      rows: rows(),
      rowHeight,
      viewportHeight: viewportHeightState(),
      scrollTop: scrollTopState(),
      overscan,
    }),
  );

  const value = computed<T | undefined>(() => selectedState()[0]);
  const empty = computed(() => selectedState().length === 0);

  function isSelected(option: T): boolean {
    return selectedValues().has(getValue(option));
  }

  function resolveCloseOnSelect(): boolean {
    return options.closeOnSelect != null
      ? Boolean(toAccessor(options.closeOnSelect)())
      : !multiple();
  }

  function firstActiveTarget(): number {
    const selectedRow = baseRows().find(
      (row) => row.type === 'option' && row.selected && !row.disabled,
    );
    if (selectedRow) {
      return selectedRow.index;
    }
    const indexes = enabledIndexes();
    return indexes.length > 0 ? indexes[0] : -1;
  }

  function resetActive(): void {
    activeIndexState.set(firstActiveTarget());
  }

  function openPanel(): void {
    if (openState()) {
      return;
    }
    openState.set(true);
    if (activeIndexState() < 0) {
      resetActive();
    }
  }

  function closePanel(): void {
    openState.set(false);
  }

  function toggle(): void {
    if (openState()) {
      closePanel();
    } else {
      openPanel();
    }
  }

  function setQuery(query: string): void {
    queryState.set(query);
    openState.set(true);
    resetActive();
  }

  function select(option: T): void {
    if (getDisabled(option)) {
      return;
    }
    if (multiple()) {
      if (!isSelected(option)) {
        selectedState.set([...selectedState(), option]);
      }
    } else {
      selectedState.set([option]);
    }
    if (resolveCloseOnSelect()) {
      closePanel();
    }
  }

  function deselect(option: T): void {
    const target = getValue(option);
    selectedState.set(
      selectedState().filter((current) => getValue(current) !== target),
    );
  }

  function toggleSelection(option: T): void {
    if (getDisabled(option)) {
      return;
    }
    if (isSelected(option)) {
      deselect(option);
    } else {
      select(option);
    }
  }

  function clear(): void {
    selectedState.set([]);
  }

  function moveActive(direction: 1 | -1): void {
    const indexes = enabledIndexes();
    if (indexes.length === 0) {
      activeIndexState.set(-1);
      return;
    }
    const current = activeIndexState();
    if (direction === 1) {
      const next = indexes.find((index) => index > current);
      activeIndexState.set(next ?? indexes[0]);
    } else {
      let previous: number | undefined;
      for (const index of indexes) {
        if (index < current) {
          previous = index;
        } else {
          break;
        }
      }
      activeIndexState.set(previous ?? indexes[indexes.length - 1]);
    }
  }

  function first(): void {
    const indexes = enabledIndexes();
    if (indexes.length > 0) {
      activeIndexState.set(indexes[0]);
    }
  }

  function last(): void {
    const indexes = enabledIndexes();
    if (indexes.length > 0) {
      activeIndexState.set(indexes[indexes.length - 1]);
    }
  }

  function selectActive(): void {
    const option = activeOption();
    if (!option) {
      return;
    }
    if (multiple()) {
      toggleSelection(option);
    } else {
      select(option);
    }
  }

  function onKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (openState()) {
          moveActive(1);
        } else {
          openPanel();
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (openState()) {
          moveActive(-1);
        } else {
          openPanel();
        }
        break;
      case 'Enter':
        if (openState()) {
          event.preventDefault();
          selectActive();
        }
        break;
      case 'Escape':
        if (openState()) {
          event.preventDefault();
          closePanel();
        }
        break;
      case 'Home':
        if (openState()) {
          event.preventDefault();
          first();
        }
        break;
      case 'End':
        if (openState()) {
          event.preventDefault();
          last();
        }
        break;
      default:
        break;
    }
  }

  function setScrollTop(scrollTop: number): void {
    scrollTopState.set(nonNegative(scrollTop));
  }

  function setViewportHeight(height: number): void {
    viewportHeightState.set(nonNegative(height));
  }

  return {
    open: openState.asReadonly(),
    openPanel,
    closePanel,
    toggle,

    query: queryState.asReadonly(),
    setQuery,

    multiple,
    selected: selectedState.asReadonly(),
    value,
    empty,
    isSelected,
    select,
    deselect,
    toggleSelection,
    clear,

    rows,
    optionCount,

    activeIndex: activeIndexState.asReadonly(),
    activeOption,
    next: () => moveActive(1),
    previous: () => moveActive(-1),
    first,
    last,
    selectActive,
    onKeydown,

    virtual,
    setScrollTop,
    setViewportHeight,
  };
}
