import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import {
  calculateArbitrageStakes,
  fractionFromNumber,
  fractionToNumber,
} from '@dgkit/betting-math';

import { DemoCard } from '../ui/demo-card';

@Component({
  selector: 'dg-betting-math-arbitrage-demo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoCard, DecimalPipe],
  template: `
    <dg-demo-card
      pkg="betting-math"
      blurb="Arbitrage stake-splitting — the same guaranteed return across every outcome, to the exact fraction."
    >
      <div class="controls">
        <input
          class="dg-input"
          type="number"
          step="0.01"
          placeholder="odds A"
          [value]="oddsAInput()"
          (input)="oddsAInput.set(asValue($event))"
        />
        <input
          class="dg-input"
          type="number"
          step="0.01"
          placeholder="odds B"
          [value]="oddsBInput()"
          (input)="oddsBInput.set(asValue($event))"
        />
      </div>
      <input
        class="dg-input"
        type="number"
        placeholder="total stake"
        [value]="stakeInput()"
        (input)="stakeInput.set(asValue($event))"
      />

      @if (result(); as r) {
        <span
          class="pill"
          [class.ok]="r.isArbitrage"
          [class.warn]="!r.isArbitrage"
        >
          {{ r.isArbitrage ? 'arbitrage' : 'no arbitrage' }} · roi
          {{ r.roiPercent | number: '1.2-2' }}%
        </span>
        <span class="muted">
          stake A <span class="metric">{{ r.stakeA | number: '1.2-2' }}</span>
          · stake B
          <span class="metric">{{ r.stakeB | number: '1.2-2' }}</span>
        </span>
        <span class="muted">
          guaranteed profit
          <span class="metric">{{ r.guaranteedProfit | number: '1.2-2' }}</span>
        </span>
      } @else {
        <span class="pill warn"
          >enter two decimal odds &gt; 1 and a positive stake</span
        >
      }
    </dg-demo-card>
  `,
})
export class BettingMathArbitrageDemo {
  protected readonly oddsAInput = signal('2.05');
  protected readonly oddsBInput = signal('2.10');
  protected readonly stakeInput = signal('100');

  protected readonly result = computed(() => {
    const oddsA = Number(this.oddsAInput());
    const oddsB = Number(this.oddsBInput());
    const stake = Number(this.stakeInput());

    if (
      !Number.isFinite(oddsA) ||
      oddsA <= 1 ||
      !Number.isFinite(oddsB) ||
      oddsB <= 1 ||
      !Number.isFinite(stake) ||
      stake <= 0
    ) {
      return undefined;
    }

    try {
      const { lines, guaranteedProfit, roi, isArbitrage } =
        calculateArbitrageStakes(
          [fractionFromNumber(oddsA), fractionFromNumber(oddsB)],
          fractionFromNumber(stake),
        );
      return {
        stakeA: fractionToNumber(lines[0].stake),
        stakeB: fractionToNumber(lines[1].stake),
        guaranteedProfit: fractionToNumber(guaranteedProfit),
        roiPercent: fractionToNumber(roi) * 100,
        isArbitrage,
      };
    } catch {
      return undefined;
    }
  });

  protected asValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }
}
