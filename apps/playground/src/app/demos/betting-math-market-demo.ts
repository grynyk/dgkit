import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import {
  calculateFairOdds,
  calculateOverround,
  fractionFromNumber,
  fractionToNumber,
} from '@dgkit/betting-math';

import { DemoCard } from '../ui/demo-card';

@Component({
  selector: 'dg-betting-math-market-demo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoCard, DecimalPipe],
  template: `
    <dg-demo-card
      pkg="betting-math"
      blurb="Market overround and de-vigged fair odds — the number every trading desk watches."
    >
      <div class="controls">
        <input
          class="dg-input"
          type="number"
          step="0.01"
          placeholder="home odds"
          [value]="homeInput()"
          (input)="homeInput.set(asValue($event))"
        />
        <input
          class="dg-input"
          type="number"
          step="0.01"
          placeholder="away odds"
          [value]="awayInput()"
          (input)="awayInput.set(asValue($event))"
        />
      </div>

      @if (result(); as r) {
        <span class="muted">
          overround
          <span class="metric"
            >{{ r.overroundPercent | number: '1.2-2' }}%</span
          >
        </span>
        <span class="muted">
          fair odds
          <span class="metric">{{ r.fairHome | number: '1.2-2' }}</span>
          /
          <span class="metric">{{ r.fairAway | number: '1.2-2' }}</span>
        </span>
      } @else {
        <span class="pill warn">enter two decimal odds &gt; 1</span>
      }
    </dg-demo-card>
  `,
})
export class BettingMathMarketDemo {
  protected readonly homeInput = signal('1.91');
  protected readonly awayInput = signal('1.91');

  protected readonly result = computed(() => {
    const home = Number(this.homeInput());
    const away = Number(this.awayInput());
    if (
      !Number.isFinite(home) ||
      home <= 1 ||
      !Number.isFinite(away) ||
      away <= 1
    ) {
      return undefined;
    }

    try {
      const market = [fractionFromNumber(home), fractionFromNumber(away)];
      const overround = calculateOverround(market);
      const [fairHome, fairAway] = calculateFairOdds(market);
      return {
        overroundPercent: fractionToNumber(overround) * 100,
        fairHome: fractionToNumber(fairHome),
        fairAway: fractionToNumber(fairAway),
      };
    } catch {
      return undefined;
    }
  });

  protected asValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }
}
