import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import { formatOdds, parseOdds } from '@dgkit/betting-math';

import { DemoCard } from '../ui/demo-card';

@Component({
  selector: 'dg-betting-math-demo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoCard, DecimalPipe],
  template: `
    <dg-demo-card
      pkg="betting-math"
      blurb="Exact-rational odds conversion — every format derives from one canonical decimal Fraction."
    >
      <input
        class="dg-input"
        type="number"
        step="0.01"
        placeholder="decimal odds, e.g. 2.5"
        [value]="decimalInput()"
        (input)="decimalInput.set(asValue($event))"
      />

      @if (formatted(); as f) {
        <span class="muted"
          >fractional <span class="metric">{{ f.fractional }}</span></span
        >
        <span class="muted"
          >american
          <span class="metric">{{ f.american | number: '1.0-2' }}</span></span
        >
        <span class="muted"
          >hong kong
          <span class="metric">{{ f.hongkong | number: '1.0-2' }}</span></span
        >
        <span class="muted"
          >malay
          <span class="metric">{{ f.malay | number: '1.0-2' }}</span></span
        >
        <span class="muted"
          >indonesian
          <span class="metric">{{ f.indonesian | number: '1.0-2' }}</span></span
        >
      } @else {
        <span class="pill warn">enter decimal odds &gt; 1</span>
      }
    </dg-demo-card>
  `,
})
export class BettingMathDemo {
  protected readonly decimalInput = signal('2.5');

  private readonly decimal = computed(() => {
    const value = Number(this.decimalInput());
    if (!Number.isFinite(value) || value <= 1) {
      return undefined;
    }
    try {
      return parseOdds(value, 'decimal');
    } catch {
      return undefined;
    }
  });

  protected readonly formatted = computed(() => {
    const decimal = this.decimal();
    if (!decimal) {
      return undefined;
    }
    return {
      fractional: formatOdds(decimal, 'fractional'),
      american: formatOdds(decimal, 'american'),
      hongkong: formatOdds(decimal, 'hongkong'),
      malay: formatOdds(decimal, 'malay'),
      indonesian: formatOdds(decimal, 'indonesian'),
    };
  });

  protected asValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }
}
