/**
 * Public API of `@dgkit/combobox`.
 *
 * A headless combobox controller (`injectCombobox`) that owns selection,
 * filtering, grouping, keyboard navigation and fixed-height virtual scrolling
 * as signals, plus the pure `computeVirtualWindow` helper it is built on.
 * The consumer owns the template, enabling custom option markup and layout.
 */
export { injectCombobox } from './lib/combobox';
export { computeVirtualWindow } from './lib/combobox.virtual';
export type { DgVirtualWindowInput } from './lib/combobox.virtual';
export type {
  DgComboboxOptions,
  DgComboboxRef,
  DgComboboxRow,
  DgComboboxRowType,
  DgComboboxVirtualOptions,
  DgComboboxVirtualWindow,
  DgValueOrAccessor,
} from './lib/combobox.types';
