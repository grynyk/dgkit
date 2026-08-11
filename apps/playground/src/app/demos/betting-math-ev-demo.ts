import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import {
  calculateExpectedValue,
  divideFractions,
  fraction,
  fractionFromNumber,
  fractionToNumber,
} from '@dgkit/betting-math';

import { DemoCard } from '../ui/demo-card';

@Component({
  selector: 'dg-betting-math-ev-demo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoCard, DecimalPipe],
  template: `
    <dg-demo-card
      pkg="betting-math"
      blurb="Expected value — your own probability estimate vs. the price on offer."
    >
      <div class="controls">
        <input
          class="dg-input"
          type="number"
          step="1"
          placeholder="true probability %"
          [value]="probabilityInput()"
          (input)="probabilityInput.set(asValue($event))"
        />
        <input
          class="dg-input"
          type="number"
          step="0.01"
          placeholder="odds"
          [value]="oddsInput()"
          (input)="oddsInput.set(asValue($event))"
        />
      </div>
      <input
        class="dg-input"
        type="number"
        placeholder="stake"
        [value]="stakeInput()"
        (input)="stakeInput.set(asValue($event))"
      />

      @if (result(); as r) {
        <span class="pill" [class.ok]="r.edge > 0" [class.warn]="r.edge <= 0">
          {{ r.edge > 0 ? 'positive EV' : 'negative EV' }} · edge
          {{ r.edgePercent | number: '1.2-2' }}%
        </span>
        <span class="muted">
          expected value
          <span class="metric">{{ r.expectedValue | number: '1.2-2' }}</span>
        </span>
        <span class="muted">
          implied probability
          <span class="metric"
            >{{ r.impliedProbabilityPercent | number: '1.2-2' }}%</span
          >
        </span>
      } @else {
        <span class="pill warn"
          >enter probability in (0, 100], odds &gt; 1, stake &gt; 0</span
        >
      }
    </dg-demo-card>
  `,
})
export class BettingMathEvDemo {
  protected readonly probabilityInput = signal('55');
  protected readonly oddsInput = signal('2.10');
  protected readonly stakeInput = signal('100');

  protected readonly result = computed(() => {
    const probability = Number(this.probabilityInput());
    const odds = Number(this.oddsInput());
    const stake = Number(this.stakeInput());

    if (
      !Number.isFinite(probability) ||
      probability <= 0 ||
      probability > 100 ||
      !Number.isFinite(odds) ||
      odds <= 1 ||
      !Number.isFinite(stake) ||
      stake <= 0
    ) {
      return undefined;
    }

    try {
      const trueProbability = divideFractions(
        fractionFromNumber(probability),
        fraction(100),
      );
      const { expectedValue, edge, impliedProbability } =
        calculateExpectedValue(
          trueProbability,
          fractionFromNumber(odds),
          fractionFromNumber(stake),
        );
      return {
        expectedValue: fractionToNumber(expectedValue),
        edge: fractionToNumber(edge),
        edgePercent: fractionToNumber(edge) * 100,
        impliedProbabilityPercent: fractionToNumber(impliedProbability) * 100,
      };
    } catch {
      return undefined;
    }
  });

  protected asValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }
}
