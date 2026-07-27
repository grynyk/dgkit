import type { Signal } from '@angular/core';

/**
 * A value that may be supplied directly or as a reactive accessor (any
 * zero-argument function, which includes Angular signals).
 */
export type DgValueOrAccessor<T> = T | (() => T);

/** The two types of row the combobox flattens its options into. */
export type DgComboboxRowType = 'group' | 'option';

/**
 * A flattened, render-ready row. The combobox turns a (filtered) list of
 * grouped options into a single flat list of rows so the same index space can
 * drive keyboard navigation and fixed-height virtual scrolling.
 */
export interface DgComboboxRow<T> {
  /** Discriminates a group header from a selectable option. */
  readonly type: DgComboboxRowType;
  /** Position of this row within the full flat (filtered) row list. */
  readonly index: number;
  /** Group label — set on group headers and on each grouped option row. */
  readonly group?: string;
  /** The option payload. Present only when `type === 'option'`. */
  readonly option?: T;
  /** Whether this option is selected. Always `false` for group rows. */
  readonly selected: boolean;
  /** Whether this option is disabled. Always `false` for group rows. */
  readonly disabled: boolean;
  /** Whether this row is the active descendant (keyboard highlight). */
  readonly active: boolean;
}

/** Fixed-height virtual scrolling configuration. */
export interface DgComboboxVirtualOptions {
  /**
   * Height of every row in pixels. Group headers and option rows must share
   * this height for the windowing math to line up. Omit virtualization by not
   * passing a `virtual` config at all.
   */
  readonly rowHeight: number;
  /** Height of the scroll viewport in pixels. Can be updated at runtime. */
  readonly viewportHeight?: number;
  /** Extra rows rendered above and below the viewport. Defaults to `4`. */
  readonly overscan?: number;
}

/** The slice of rows to render for the current scroll position. */
export interface DgComboboxVirtualWindow<T> {
  /** Total scroll height of every row, in pixels. */
  readonly totalHeight: number;
  /** Y offset (e.g. `translateY`) of the first rendered row, in pixels. */
  readonly offsetY: number;
  /** Index of the first rendered row in the flat row list. */
  readonly startIndex: number;
  /** Index just past the last rendered row (exclusive). */
  readonly endIndex: number;
  /** The rows to actually render this frame. */
  readonly rows: readonly DgComboboxRow<T>[];
}

/** Options accepted by {@link injectCombobox}. */
export interface DgComboboxOptions<T> {
  /** Reactive source of options — a signal, accessor, or plain array. */
  readonly options: DgValueOrAccessor<readonly T[]>;
  /**
   * Identity of an option, used for selection equality. Defaults to the option
   * itself (reference identity).
   */
  readonly optionValue?: (option: T) => unknown;
  /**
   * Display/searchable label for an option. Used by the default filter.
   * Defaults to `String(option)`.
   */
  readonly optionLabel?: (option: T) => string;
  /** Whether an option is disabled. Defaults to `false`. */
  readonly optionDisabled?: (option: T) => boolean;
  /**
   * Group label for an option. Options returning `undefined`/`''` render
   * ungrouped (before any groups). Omit to disable grouping entirely.
   */
  readonly optionGroup?: (option: T) => string | undefined;
  /** Enable multiple selection. Reactive if an accessor. Defaults to `false`. */
  readonly multiple?: DgValueOrAccessor<boolean>;
  /**
   * Predicate deciding whether an option matches the current query. Defaults
   * to a case-insensitive substring match against `optionLabel`.
   */
  readonly filter?: (option: T, query: string) => boolean;
  /**
   * Close the panel after a selection. Defaults to `true` for single-select
   * and `false` for multiselect.
   */
  readonly closeOnSelect?: DgValueOrAccessor<boolean>;
  /** Fixed-height virtual scrolling. Omit to render every row. */
  readonly virtual?: DgComboboxVirtualOptions;
}

/**
 * The headless combobox controller returned by {@link injectCombobox}.
 *
 * It owns all state (panel open, query, selection, active descendant and the
 * virtual window) as signals, and exposes imperative methods to drive it. It
 * renders nothing — the consumer owns the template, which is what makes custom
 * option templates, grouping headers and arbitrary markup possible.
 */
export interface DgComboboxRef<T> {
  /** Whether the options panel is open. */
  readonly open: Signal<boolean>;
  /** Open the panel and move the active descendant to a sensible row. */
  openPanel(): void;
  /** Close the panel. */
  closePanel(): void;
  /** Toggle the panel open/closed. */
  toggle(): void;

  /** The current filter query. */
  readonly query: Signal<string>;
  /** Set the filter query (also opens the panel and resets the highlight). */
  setQuery(query: string): void;

  /** Whether multiple selection is enabled. */
  readonly multiple: Signal<boolean>;
  /** The selected options, in selection order. */
  readonly selected: Signal<readonly T[]>;
  /** The first selected option — the convenient accessor for single-select. */
  readonly value: Signal<T | undefined>;
  /** Whether nothing is selected. */
  readonly empty: Signal<boolean>;
  /** Whether `option` is currently selected. */
  isSelected(option: T): boolean;
  /** Select `option` (adds in multiselect, replaces in single-select). */
  select(option: T): void;
  /** Remove `option` from the selection. */
  deselect(option: T): void;
  /** Select `option` if unselected, otherwise deselect it. */
  toggleSelection(option: T): void;
  /** Clear the entire selection. */
  clear(): void;

  /** The full flat list of (filtered) rows, with `active`/`selected` applied. */
  readonly rows: Signal<readonly DgComboboxRow<T>[]>;
  /** Number of option rows after filtering (excludes group headers). */
  readonly optionCount: Signal<number>;

  /** Flat-row index of the active descendant, or `-1` when there is none. */
  readonly activeIndex: Signal<number>;
  /** The active option, or `undefined` when no option is active. */
  readonly activeOption: Signal<T | undefined>;
  /** Move the highlight to the next enabled option (wraps). */
  next(): void;
  /** Move the highlight to the previous enabled option (wraps). */
  previous(): void;
  /** Move the highlight to the first enabled option. */
  first(): void;
  /** Move the highlight to the last enabled option. */
  last(): void;
  /** Select (or toggle, in multiselect) the active option. */
  selectActive(): void;
  /** Convenience keyboard handler for the trigger input. */
  onKeydown(event: KeyboardEvent): void;

  /** The rows to render for the current scroll position. */
  readonly virtual: Signal<DgComboboxVirtualWindow<T>>;
  /** Report the scroll container's `scrollTop`. */
  setScrollTop(scrollTop: number): void;
  /** Report the scroll viewport's height. */
  setViewportHeight(height: number): void;
}
