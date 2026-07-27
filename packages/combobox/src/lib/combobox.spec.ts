import { signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { injectCombobox } from './combobox';
import type { DgComboboxRef } from './combobox.types';

interface City {
  readonly id: number;
  readonly name: string;
  readonly country: string;
  readonly disabled?: boolean;
}

const CITIES: readonly City[] = [
  { id: 1, name: 'Kyiv', country: 'Ukraine' },
  { id: 2, name: 'Lviv', country: 'Ukraine', disabled: true },
  { id: 3, name: 'Odesa', country: 'Ukraine' },
  { id: 4, name: 'Berlin', country: 'Germany' },
  { id: 5, name: 'Munich', country: 'Germany' },
];

function make(
  overrides: Partial<Parameters<typeof injectCombobox<City>>[0]> = {},
): DgComboboxRef<City> {
  return injectCombobox<City>({
    options: CITIES,
    optionValue: (c) => c.id,
    optionLabel: (c) => c.name,
    optionDisabled: (c) => Boolean(c.disabled),
    optionGroup: (c) => c.country,
    ...overrides,
  });
}

function key(name: string): KeyboardEvent {
  return new KeyboardEvent('keydown', { key: name, cancelable: true });
}

describe('injectCombobox', () => {
  let cb: DgComboboxRef<City>;

  beforeEach(() => {
    cb = make();
  });

  it('starts closed, empty and unfiltered', () => {
    expect(cb.open()).toBe(false);
    expect(cb.empty()).toBe(true);
    expect(cb.value()).toBeUndefined();
    expect(cb.selected()).toEqual([]);
    expect(cb.optionCount()).toBe(5);
    expect(cb.activeIndex()).toBe(-1);
  });

  describe('panel state', () => {
    it('opens, closes and toggles', () => {
      cb.openPanel();
      expect(cb.open()).toBe(true);
      cb.closePanel();
      expect(cb.open()).toBe(false);
      cb.toggle();
      expect(cb.open()).toBe(true);
      cb.toggle();
      expect(cb.open()).toBe(false);
    });

    it('highlights the first enabled option on open', () => {
      cb.openPanel();
      // rows: #Ukraine(0) Kyiv(1) Lviv(2,disabled) Odesa(3) #Germany(4) ...
      expect(cb.activeIndex()).toBe(1);
      expect(cb.activeOption()?.name).toBe('Kyiv');
    });

    it('re-opening does not move an existing highlight', () => {
      cb.openPanel();
      cb.next(); // Odesa (skips disabled Lviv)
      const active = cb.activeIndex();
      cb.closePanel();
      cb.openPanel();
      expect(cb.activeIndex()).toBe(active);
    });

    it('highlights the first selected option on open', () => {
      cb.select(CITIES[3]); // Berlin, single-select closes
      cb.openPanel();
      expect(cb.activeOption()?.name).toBe('Berlin');
    });
  });

  describe('filtering', () => {
    it('filters options by a case-insensitive label match', () => {
      cb.setQuery('KY');
      expect(cb.rows().filter((r) => r.type === 'option').map((r) => r.option?.name)).toEqual([
        'Kyiv',
      ]);
      expect(cb.optionCount()).toBe(1);
    });

    it('opens the panel and resets the highlight when querying', () => {
      cb.setQuery('mun');
      expect(cb.open()).toBe(true);
      expect(cb.activeOption()?.name).toBe('Munich');
    });

    it('drops empty groups from the rows', () => {
      cb.setQuery('berlin');
      const groups = cb.rows().filter((r) => r.type === 'group');
      expect(groups.map((g) => g.group)).toEqual(['Germany']);
    });

    it('supports a custom filter predicate', () => {
      const custom = make({ filter: (city, q) => city.country.toLowerCase().includes(q) });
      custom.setQuery('german');
      expect(custom.optionCount()).toBe(2);
    });

    it('reacts to a reactive options source', () => {
      const source = signal<readonly City[]>(CITIES.slice(0, 1));
      const reactive = injectCombobox<City>({ options: source, optionValue: (c) => c.id });
      expect(reactive.optionCount()).toBe(1);
      source.set(CITIES);
      expect(reactive.optionCount()).toBe(5);
    });
  });

  describe('single selection', () => {
    it('replaces the selection and closes on select', () => {
      cb.openPanel();
      cb.select(CITIES[0]);
      expect(cb.value()?.name).toBe('Kyiv');
      expect(cb.open()).toBe(false);
      cb.select(CITIES[3]);
      expect(cb.selected()).toHaveLength(1);
      expect(cb.value()?.name).toBe('Berlin');
    });

    it('can override closeOnSelect', () => {
      const sticky = make({ closeOnSelect: false });
      sticky.openPanel();
      sticky.select(CITIES[0]);
      expect(sticky.open()).toBe(true);
    });
  });

  describe('multiple selection', () => {
    beforeEach(() => {
      cb = make({ multiple: true });
    });

    it('accumulates selections without closing', () => {
      cb.openPanel();
      cb.select(CITIES[0]);
      cb.select(CITIES[3]);
      expect(cb.selected().map((c) => c.name)).toEqual(['Kyiv', 'Berlin']);
      expect(cb.open()).toBe(true);
    });

    it('does not add the same option twice', () => {
      cb.select(CITIES[0]);
      cb.select(CITIES[0]);
      expect(cb.selected()).toHaveLength(1);
    });

    it('toggles and clears', () => {
      cb.toggleSelection(CITIES[0]);
      cb.toggleSelection(CITIES[3]);
      expect(cb.selected()).toHaveLength(2);
      cb.toggleSelection(CITIES[0]);
      expect(cb.selected().map((c) => c.name)).toEqual(['Berlin']);
      cb.clear();
      expect(cb.empty()).toBe(true);
    });

    it('marks selected rows', () => {
      cb.select(CITIES[0]);
      const kyiv = cb.rows().find((r) => r.option?.id === 1);
      expect(kyiv?.selected).toBe(true);
    });
  });

  describe('disabled options', () => {
    it('ignores select/toggle on a disabled option', () => {
      cb.select(CITIES[1]); // Lviv (disabled)
      cb.toggleSelection(CITIES[1]);
      expect(cb.empty()).toBe(true);
    });
  });

  describe('keyboard navigation', () => {
    it('skips disabled options and wraps', () => {
      cb.openPanel();
      expect(cb.activeOption()?.name).toBe('Kyiv');
      cb.next(); // skips disabled Lviv → Odesa
      expect(cb.activeOption()?.name).toBe('Odesa');
      cb.previous();
      expect(cb.activeOption()?.name).toBe('Kyiv');
      cb.previous(); // wraps to last (Munich)
      expect(cb.activeOption()?.name).toBe('Munich');
      cb.next(); // wraps to first (Kyiv)
      expect(cb.activeOption()?.name).toBe('Kyiv');
    });

    it('jumps to first and last enabled options', () => {
      cb.openPanel();
      cb.last();
      expect(cb.activeOption()?.name).toBe('Munich');
      cb.first();
      expect(cb.activeOption()?.name).toBe('Kyiv');
    });

    it('opens on ArrowDown/ArrowUp when closed', () => {
      cb.onKeydown(key('ArrowDown'));
      expect(cb.open()).toBe(true);
      cb.closePanel();
      cb.onKeydown(key('ArrowUp'));
      expect(cb.open()).toBe(true);
    });

    it('navigates with arrows when open', () => {
      cb.openPanel();
      cb.onKeydown(key('ArrowDown'));
      expect(cb.activeOption()?.name).toBe('Odesa');
      cb.onKeydown(key('ArrowUp'));
      expect(cb.activeOption()?.name).toBe('Kyiv');
    });

    it('selects the active option on Enter', () => {
      cb.openPanel();
      cb.onKeydown(key('Enter'));
      expect(cb.value()?.name).toBe('Kyiv');
    });

    it('toggles the active option on Enter in multiselect', () => {
      cb = make({ multiple: true });
      cb.openPanel();
      cb.onKeydown(key('Enter'));
      expect(cb.selected()).toHaveLength(1);
      cb.onKeydown(key('Enter'));
      expect(cb.empty()).toBe(true);
    });

    it('closes on Escape and moves with Home/End', () => {
      cb.openPanel();
      cb.onKeydown(key('End'));
      expect(cb.activeOption()?.name).toBe('Munich');
      cb.onKeydown(key('Home'));
      expect(cb.activeOption()?.name).toBe('Kyiv');
      cb.onKeydown(key('Escape'));
      expect(cb.open()).toBe(false);
    });

    it('prevents default for handled keys and ignores others', () => {
      cb.openPanel();
      const down = key('ArrowDown');
      const spy = vi.spyOn(down, 'preventDefault');
      cb.onKeydown(down);
      expect(spy).toHaveBeenCalled();

      const other = key('a');
      const otherSpy = vi.spyOn(other, 'preventDefault');
      cb.onKeydown(other);
      expect(otherSpy).not.toHaveBeenCalled();
    });

    it('does nothing on Enter/Home/End while closed', () => {
      cb.onKeydown(key('Enter'));
      cb.onKeydown(key('Home'));
      cb.onKeydown(key('End'));
      cb.onKeydown(key('Escape'));
      expect(cb.empty()).toBe(true);
      expect(cb.open()).toBe(false);
    });

    it('selectActive is a no-op with no active option', () => {
      cb.selectActive();
      expect(cb.empty()).toBe(true);
    });

    it('clears the highlight when navigating with no enabled options', () => {
      const empty = injectCombobox<City>({
        options: [CITIES[1]], // only the disabled Lviv
        optionValue: (c) => c.id,
        optionDisabled: () => true,
      });
      empty.openPanel();
      empty.next();
      expect(empty.activeIndex()).toBe(-1);
    });
  });

  describe('virtual scrolling', () => {
    it('renders every row without a virtual config', () => {
      const window = cb.virtual();
      expect(window.rows).toHaveLength(cb.rows().length);
      expect(window.offsetY).toBe(0);
    });

    it('windows rows once a row height and viewport are known', () => {
      const big: readonly City[] = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `City ${i}`,
        country: 'X',
      }));
      const virtual = injectCombobox<City>({
        options: big,
        optionValue: (c) => c.id,
        optionLabel: (c) => c.name,
        virtual: { rowHeight: 20, viewportHeight: 200, overscan: 2 },
      });
      virtual.setScrollTop(2000);
      const window = virtual.virtual();
      expect(window.totalHeight).toBe(1000 * 20);
      expect(window.rows.length).toBeLessThan(20);
      expect(window.startIndex).toBeGreaterThan(90);
    });

    it('guards scrollTop and viewport height against bad values', () => {
      const virtual = injectCombobox<City>({
        options: CITIES,
        optionValue: (c) => c.id,
        virtual: { rowHeight: 20, viewportHeight: 100 },
      });
      virtual.setScrollTop(Number.NaN);
      virtual.setViewportHeight(-10);
      // Bad viewport height disables virtualization → renders all rows at offset 0.
      expect(virtual.virtual().offsetY).toBe(0);
      expect(virtual.virtual().rows).toHaveLength(5);
    });
  });
});
