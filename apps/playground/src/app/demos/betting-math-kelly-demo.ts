import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import {
  calculateKellyStake,
  divideFractions,
  fraction,
  fractionFromNumber,
  fractionToNumber,
} from '@dgkit/betting-math';

import { DemoCard } from '../ui/demo-card';

@Component({
  selector: 'dg-betting-math-kelly-demo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoCard, DecimalPipe],
  template: `
    <dg-demo-card
      pkg="betting-math"
      blurb="Kelly criterion staking — optimal bankroll fraction, with an adjustable fractional-Kelly multiplier."
    >
      <div class="controls">
        <input
          class="dg-input"
          type="number"
          step="1"
          placeholder="fair probability %"
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
      <div class="controls">
        <input
          class="dg-input"
          type="number"
          placeholder="bankroll"
          [value]="bankrollInput()"
          (input)="bankrollInput.set(asValue($event))"
        />
        <input
          class="dg-input"
          type="number"
          step="1"
          placeholder="Kelly fraction % (100 = full)"
          [value]="kellyFractionInput()"
          (input)="kellyFractionInput.set(asValue($event))"
        />
      </div>

      @if (result(); as r) {
        <span class="pill" [class.ok]="r.hasEdge" [class.warn]="!r.hasEdge">
          {{ r.hasEdge ? 'has edge' : 'no edge' }} · full Kelly
          {{ r.fullKellyPercent | number: '1.2-2' }}%
        </span>
        <span class="muted">
          recommended stake
          <span class="metric">{{ r.recommendedStake | number: '1.2-2' }}</span>
        </span>
        <span class="muted">
          applied fraction
          <span class="metric">{{ r.appliedPercent | number: '1.2-2' }}%</span>
        </span>
      } @else {
        <span class="pill warn"
          >probability in (0, 100], odds &gt; 1, bankroll &gt; 0, Kelly fraction
          % &gt; 0</span
        >
      }
    </dg-demo-card>
  `,
})
export class BettingMathKellyDemo {
  protected readonly probabilityInput = signal('60');
  protected readonly oddsInput = signal('2.00');
  protected readonly bankrollInput = signal('1000');
  protected readonly kellyFractionInput = signal('100');

  protected readonly result = computed(() => {
    const probability = Number(this.probabilityInput());
    const odds = Number(this.oddsInput());
    const bankroll = Number(this.bankrollInput());
    const kellyFractionPercent = Number(this.kellyFractionInput());

    if (
      !Number.isFinite(probability) ||
      probability <= 0 ||
      probability > 100 ||
      !Number.isFinite(odds) ||
      odds <= 1 ||
      !Number.isFinite(bankroll) ||
      bankroll <= 0 ||
      !Number.isFinite(kellyFractionPercent) ||
      kellyFractionPercent <= 0
    ) {
      return undefined;
    }

    try {
      const fairProbability = divideFractions(
        fractionFromNumber(probability),
        fraction(100),
      );
      const kellyFraction = divideFractions(
        fractionFromNumber(kellyFractionPercent),
        fraction(100),
      );
      const { recommendedStake, fullKellyFraction, appliedFraction, hasEdge } =
        calculateKellyStake(
          fairProbability,
          fractionFromNumber(odds),
          fractionFromNumber(bankroll),
          kellyFraction,
        );
      return {
        recommendedStake: fractionToNumber(recommendedStake),
        fullKellyPercent: fractionToNumber(fullKellyFraction) * 100,
        appliedPercent: fractionToNumber(appliedFraction) * 100,
        hasEdge,
      };
    } catch {
      return undefined;
    }
  });

  protected asValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }
}
