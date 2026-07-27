# @dgkit/combobox

[![npm](https://img.shields.io/npm/v/@dgkit/combobox)](https://www.npmjs.com/package/@dgkit/combobox)

A **headless**, **signal-based** combobox controller for Angular. It owns all
the hard state — panel open, filtering, single/multiple selection, grouping,
keyboard active-descendant and fixed-height virtual scrolling — and **renders
nothing**. You bring the template, so the markup, styling, group headers and
option layout are entirely yours.

- ✅ `injectCombobox<T>()` — one factory returning a fully reactive controller
- ✅ **Multiselect** or single-select, with reactive `multiple`
- ✅ **Grouping** via `optionGroup` — flattened to render-ready rows
- ✅ **Virtual scrolling** — fixed-height windowing for large lists
- ✅ **Custom templates** — it renders nothing, you own every row
- ✅ Full keyboard support — arrows, Enter, Escape, Home/End, disabled-skipping
- ✅ Reactive options + filtering, with a pluggable `filter` predicate
- ✅ SSR-safe & zoneless — pure signal state, no DOM, no `NgZone`, no teardown

---

## Installation

```bash
yarn add @dgkit/combobox
```

## Compatibility

Works with **Angular 18, 19, 20 and 21**.

| Peer dependency   | Supported range      |
| ----------------- | -------------------- |
| `@angular/core`   | `>=18.0.0 <22.0.0`   |
| `@angular/common` | `>=18.0.0 <22.0.0`   |
| `rxjs`            | `^6.5.3` or `^7.4.0` |

Angular and RxJS are **peer dependencies** — never bundled into the package.

## Why headless?

A combobox is mostly _behavior_: filtering, selection, keyboard navigation and
scroll math. The markup, on the other hand, is always bespoke — chips, avatars,
two-line options, custom group headers. `injectCombobox` gives you the behavior
as signals and methods, and stays out of your template completely.

## Quick start

```ts
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { injectCombobox } from '@dgkit/combobox';

interface City {
  id: number;
  name: string;
  country: string;
}

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <input
      role="combobox"
      [value]="cb.query()"
      (input)="cb.setQuery($any($event.target).value)"
      (focus)="cb.openPanel()"
      (keydown)="cb.onKeydown($event)"
    />

    @if (cb.open()) {
      <ul role="listbox">
        @for (row of cb.rows(); track row.index) {
          @if (row.type === 'group') {
            <li class="group">{{ row.group }}</li>
          } @else {
            <li
              role="option"
              [attr.aria-selected]="row.selected"
              [class.active]="row.active"
              (click)="cb.toggleSelection(row.option!)"
            >
              {{ row.option!.name }}
            </li>
          }
        }
      </ul>
    }
  `,
})
export class CityPicker {
  protected readonly cities = signal<City[]>([
    /* … */
  ]);

  protected readonly cb = injectCombobox<City>({
    options: this.cities,
    optionValue: (c) => c.id,
    optionLabel: (c) => c.name,
    optionGroup: (c) => c.country,
    multiple: true,
  });
}
```

Being pure signal state, the controller can live in a component field, a service
or any other context — it does **not** need an injection context and requires no
cleanup.

## Options

```ts
injectCombobox<T>({
  options,           // T[] | Signal<T[]> | (() => T[]) — the source list
  optionValue,       // (o: T) => unknown  — identity for selection equality
  optionLabel,       // (o: T) => string   — searchable/display label
  optionDisabled,    // (o: T) => boolean  — disable an option
  optionGroup,       // (o: T) => string | undefined — group label (omit = no groups)
  multiple,          // boolean | Signal<boolean> — enable multiselect
  filter,            // (o: T, query: string) => boolean — custom matcher
  closeOnSelect,     // boolean | Signal<boolean> — defaults true (single) / false (multi)
  virtual,           // { rowHeight, viewportHeight?, overscan? } — fixed-height windowing
});
```

Only `options` is required. `optionValue` defaults to the option itself
(reference identity) and `optionLabel` to `String(option)`. The default `filter`
is a case-insensitive substring match against `optionLabel`.

## Rows

The controller flattens the filtered, grouped options into a single flat list of
**rows** — the same index space that drives keyboard navigation and virtual
scrolling. Each row is a group header or a selectable option:

```ts
interface DgComboboxRow<T> {
  type: 'group' | 'option'; // discriminates a header from an option
  index: number; // position in the flat row list
  group?: string; // group label (headers + grouped options)
  option?: T; // the payload — present when type === 'option'
  selected: boolean; // option is selected
  disabled: boolean; // option is disabled
  active: boolean; // option is the keyboard highlight
}
```

Ungrouped options (those whose `optionGroup` returns `undefined`/`''`) render
first, before any groups. Groups appear in first-seen order, and empty groups
are dropped from the rows.

## Selection

```ts
cb.value(); // Signal<T | undefined> — first selected (single-select convenience)
cb.selected(); // Signal<readonly T[]> — all selected, in order
cb.empty(); // Signal<boolean>
cb.isSelected(option); // boolean
cb.select(option); // add (multi) / replace (single)
cb.deselect(option); // remove
cb.toggleSelection(option); // add or remove
cb.clear(); // deselect everything
```

`select`/`toggleSelection` ignore disabled options. In single-select the panel
closes after a pick (configurable via `closeOnSelect`).

## Keyboard

Wire `onKeydown` to the trigger input and it handles the standard combobox keys:

| Key                     | Behavior                                     |
| ----------------------- | -------------------------------------------- |
| `ArrowDown` / `ArrowUp` | open when closed; move the highlight (wraps) |
| `Home` / `End`          | jump to the first / last enabled option      |
| `Enter`                 | select (or toggle, in multiselect) active    |
| `Escape`                | close the panel                              |

Navigation skips disabled options. Prefer the granular methods (`next`,
`previous`, `first`, `last`, `selectActive`) if you handle keys yourself.

## Virtual scrolling

Pass a `virtual` config to window a large list at a fixed row height. Group
headers and option rows **must share `rowHeight`** for the math to line up.

```ts
protected readonly cb = injectCombobox<City>({
  options: this.cities,
  virtual: { rowHeight: 36, viewportHeight: 240, overscan: 3 },
});
```

Render only `cb.virtual().rows`, offset by `translateY`, inside a spacer sized
to the total height:

```html
<div
  class="panel"
  [style.height.px]="240"
  (scroll)="cb.setScrollTop($any($event.target).scrollTop)"
>
  <div class="spacer" [style.height.px]="cb.virtual().totalHeight">
    <div
      class="window"
      [style.transform]="'translateY(' + cb.virtual().offsetY + 'px)'"
    >
      @for (row of cb.virtual().rows; track row.index) {
        <!-- render row at rowHeight -->
      }
    </div>
  </div>
</div>
```

```ts
cb.virtual(); // Signal<DgComboboxVirtualWindow<T>> — { totalHeight, offsetY, startIndex, endIndex, rows }
cb.setScrollTop(px); // report the scroll container's scrollTop
cb.setViewportHeight(px); // report the viewport height (e.g. from a ResizeObserver)
```

Omit the `virtual` config (or pass a non-positive `rowHeight`/`viewportHeight`)
and `virtual()` simply returns every row at `offsetY: 0` — so the same template
works virtualized or not.

## API reference

### Panel

```ts
cb.open(); // Signal<boolean>
cb.openPanel();
cb.closePanel();
cb.toggle();
```

### Query & rows

```ts
cb.query(); // Signal<string>
cb.setQuery(q); // also opens the panel and resets the highlight
cb.rows(); // Signal<readonly DgComboboxRow<T>[]>
cb.optionCount(); // Signal<number> — option rows only (excludes headers)
```

### Active descendant

```ts
cb.activeIndex(); // Signal<number> — flat-row index, or -1
cb.activeOption(); // Signal<T | undefined>
cb.next();
cb.previous();
cb.first();
cb.last();
cb.selectActive();
cb.onKeydown(event);
```

## Development

```bash
yarn nx build combobox        # ng-packagr production build
yarn nx test combobox         # Vitest + coverage
yarn nx lint combobox         # ESLint
yarn nx typecheck combobox    # tsc --noEmit
```

## License

[MIT](../../LICENSE)
