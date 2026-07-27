import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { injectCombobox } from '@dgkit/combobox';

import { DemoCard } from '../ui/demo-card';

interface City {
  readonly id: number;
  readonly name: string;
  readonly country: string;
}

const COUNTRIES: Record<string, readonly string[]> = {
  Ukraine: ['Kyiv', 'Lviv', 'Odesa', 'Kharkiv', 'Dnipro', 'Zaporizhzhia'],
  Germany: ['Berlin', 'Munich', 'Hamburg', 'Cologne', 'Frankfurt', 'Stuttgart'],
  Poland: ['Warsaw', 'Kraków', 'Gdańsk', 'Wrocław', 'Poznań', 'Łódź'],
  Spain: ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Bilbao', 'Málaga'],
  Japan: ['Tokyo', 'Osaka', 'Kyoto', 'Nagoya', 'Sapporo', 'Fukuoka'],
};

const CITIES: readonly City[] = Object.entries(COUNTRIES).flatMap(
  ([country, names], group) =>
    names.map((name, i) => ({ id: group * 100 + i, name, country })),
);

const ROW_HEIGHT = 36;

@Component({
  selector: 'dg-combobox-demo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoCard],
  host: {
    '(document:pointerdown)': 'onDocumentPointerDown($event)',
  },
  template: `
    <dg-demo-card
      pkg="combobox"
      blurb="Headless combobox — multiselect, grouping, virtual scroll and a fully custom template."
    >
      <div class="controls">
        <button class="dg-btn secondary" (click)="cb.clear()">Clear</button>
        <span class="pill">{{ cb.selected().length }} selected</span>
        <span class="pill" [class.ok]="cb.open()">
          {{ cb.open() ? 'open' : 'closed' }}
        </span>
      </div>

      @if (cb.selected().length) {
        <div class="chips">
          @for (city of cb.selected(); track city.id) {
            <button class="chip" (click)="cb.deselect(city)">
              {{ city.name }} ✕
            </button>
          }
        </div>
      }

      <div class="combo">
        <input
          class="dg-input"
          placeholder="Search cities…"
          role="combobox"
          [attr.aria-expanded]="cb.open()"
          [attr.aria-activedescendant]="
            cb.activeOption() ? 'city-' + cb.activeOption()!.id : null
          "
          [value]="cb.query()"
          (input)="cb.setQuery(asValue($event))"
          (focus)="cb.openPanel()"
          (keydown)="cb.onKeydown($event)"
        />

        @if (cb.open()) {
          <div
            class="panel"
            role="listbox"
            aria-multiselectable="true"
            [style.height.px]="viewportHeight"
            (scroll)="onScroll($event)"
          >
            @if (cb.optionCount() === 0) {
              <p class="empty">No cities match “{{ cb.query() }}”.</p>
            } @else {
              <div class="spacer" [style.height.px]="window().totalHeight">
                <div
                  class="window"
                  [style.transform]="'translateY(' + window().offsetY + 'px)'"
                >
                  @for (row of window().rows; track row.index) {
                    @if (row.type === 'group') {
                      <div class="group" [style.height.px]="rowHeight">
                        {{ row.group }}
                      </div>
                    } @else {
                      <div
                        class="option"
                        role="option"
                        [id]="'city-' + row.option!.id"
                        [style.height.px]="rowHeight"
                        [class.active]="row.active"
                        [class.selected]="row.selected"
                        [attr.aria-selected]="row.selected"
                        (click)="cb.toggleSelection(row.option!)"
                      >
                        <span class="dot" [class.on]="row.selected"></span>
                        <span class="name">{{ row.option!.name }}</span>
                        <span class="muted">{{ row.option!.country }}</span>
                      </div>
                    }
                  }
                </div>
              </div>
            }
          </div>
        }
      </div>

      <span class="muted">
        {{ total }} cities · fixed {{ rowHeight }}px rows · windowed to the
        {{ viewportHeight }}px viewport
      </span>
    </dg-demo-card>
  `,
  styles: `
    .combo {
      position: relative;
      margin-top: 0.5rem;
    }
    .panel {
      margin-top: 0.35rem;
      overflow-y: auto;
      border: 1px solid #c2cbd6;
      border-radius: 6px;
      background: #fff;
    }
    .spacer {
      position: relative;
    }
    .window {
      position: absolute;
      inset: 0 0 auto 0;
      will-change: transform;
    }
    .group {
      display: flex;
      align-items: center;
      padding: 0 0.6rem;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #6b7280;
      background: #f4f6fa;
    }
    .option {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0 0.6rem;
      cursor: pointer;
    }
    .option.active {
      background: #eef1fb;
    }
    .option.selected .name {
      font-weight: 600;
      color: #1a237e;
    }
    .option .dot {
      width: 14px;
      height: 14px;
      border-radius: 4px;
      border: 1.5px solid #c2cbd6;
      flex: none;
    }
    .option .dot.on {
      background: #1a237e;
      border-color: #1a237e;
    }
    .option .name {
      flex: 1;
    }
    .empty {
      margin: 0;
      padding: 0.75rem;
      color: #6b7280;
      font-size: 0.85rem;
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin: 0.5rem 0;
    }
    .chip {
      font: inherit;
      font-size: 0.75rem;
      cursor: pointer;
      border: 1px solid #c5cae9;
      background: #e8eaf6;
      color: #283593;
      border-radius: 999px;
      padding: 0.1rem 0.5rem;
    }
  `,
})
export class ComboboxDemo {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly total = CITIES.length;
  protected readonly rowHeight = ROW_HEIGHT;
  protected readonly viewportHeight = 220;

  protected readonly cb = injectCombobox<City>({
    options: signal(CITIES),
    optionValue: (c) => c.id,
    optionLabel: (c) => c.name,
    optionGroup: (c) => c.country,
    multiple: true,
    virtual: { rowHeight: ROW_HEIGHT, viewportHeight: 220, overscan: 3 },
  });

  protected readonly window = computed(() => this.cb.virtual());

  protected asValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected onScroll(event: Event): void {
    this.cb.setScrollTop((event.target as HTMLElement).scrollTop);
  }

  protected onDocumentPointerDown(event: PointerEvent): void {
    if (
      this.cb.open() &&
      !this.host.nativeElement.contains(event.target as Node)
    ) {
      this.cb.closePanel();
    }
  }
}
