import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import {
  calculateFreeBetLayStake,
  divideFractions,
  fraction,
  fractionFromNumber,
  fractionToNumber,
} from '@dgkit/betting-math';

import { DemoCard } from '../ui/demo-card';

@Component({
  selector: 'dg-betting-math-free-bet-demo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoCard, DecimalPipe],
  template: `
    <dg-demo-card
      pkg="betting-math"
      blurb="Matched-betting free-bet extraction — the lay stake that turns a stake-not-returned bonus into guaranteed cash."
    >
      <div class="controls">
        <input
          class="dg-input"
          type="number"
          placeholder="free bet stake"
          [value]="freeBetStakeInput()"
          (input)="freeBetStakeInput.set(asValue($event))"
        />
        <input
          class="dg-input"
          type="number"
          step="0.01"
          placeholder="back odds"
          [value]="backOddsInput()"
          (input)="backOddsInput.set(asValue($event))"
        />
      </div>
      <div class="controls">
        <input
          class="dg-input"
          type="number"
          step="0.01"
          placeholder="lay odds"
          [value]="layOddsInput()"
          (input)="layOddsInput.set(asValue($event))"
        />
        <input
          class="dg-input"
          type="number"
          step="1"
          placeholder="commission %"
          [value]="commissionInput()"
          (input)="commissionInput.set(asValue($event))"
        />
      </div>

      @if (result(); as r) {
        <span class="pill ok">
          extraction {{ r.extractionRatePercent | number: '1.1-1' }}%
        </span>
        <span class="muted">
          lay stake
          <span class="metric">{{ r.layStake | number: '1.2-2' }}</span>
        </span>
        <span class="muted">
          guaranteed profit
          <span class="metric">{{ r.guaranteedProfit | number: '1.2-2' }}</span>
        </span>
      } @else {
        <span class="pill warn"
          >enter a positive free bet stake, odds &gt; 1, and a commission % in
          [0, 100)</span
        >
      }
    </dg-demo-card>
  `,
})
export class BettingMathFreeBetDemo {
  protected readonly freeBetStakeInput = signal('10');
  protected readonly backOddsInput = signal('5.00');
  protected readonly layOddsInput = signal('5.00');
  protected readonly commissionInput = signal('2');

  protected readonly result = computed(() => {
    const freeBetStake = Number(this.freeBetStakeInput());
    const backOdds = Number(this.backOddsInput());
    const layOdds = Number(this.layOddsInput());
    const commission = Number(this.commissionInput());

    if (
      !Number.isFinite(freeBetStake) ||
      freeBetStake <= 0 ||
      !Number.isFinite(backOdds) ||
      backOdds <= 1 ||
      !Number.isFinite(layOdds) ||
      layOdds <= 1 ||
      !Number.isFinite(commission) ||
      commission < 0 ||
      commission >= 100
    ) {
      return undefined;
    }

    try {
      const { layStake, guaranteedProfit, extractionRate } =
        calculateFreeBetLayStake(
          fractionFromNumber(freeBetStake),
          fractionFromNumber(backOdds),
          fractionFromNumber(layOdds),
          divideFractions(fractionFromNumber(commission), fraction(100)),
        );
      return {
        layStake: fractionToNumber(layStake),
        guaranteedProfit: fractionToNumber(guaranteedProfit),
        extractionRatePercent: fractionToNumber(extractionRate) * 100,
      };
    } catch {
      return undefined;
    }
  });

  protected asValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }
}
