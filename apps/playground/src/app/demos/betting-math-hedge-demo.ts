import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import {
  calculateExchangeLayStake,
  calculateHedgeStake,
  divideFractions,
  fraction,
  fractionFromNumber,
  fractionToNumber,
} from '@dgkit/betting-math';

import { DemoCard } from '../ui/demo-card';

@Component({
  selector: 'dg-betting-math-hedge-demo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoCard, DecimalPipe],
  template: `
    <dg-demo-card
      pkg="betting-math"
      blurb="Hedge (green-up) an open bet — a plain second back bet, or a commission-aware exchange lay."
    >
      <div class="controls">
        <input
          class="dg-input"
          type="number"
          placeholder="existing stake"
          [value]="existingStakeInput()"
          (input)="existingStakeInput.set(asValue($event))"
        />
        <input
          class="dg-input"
          type="number"
          step="0.01"
          placeholder="existing odds"
          [value]="existingOddsInput()"
          (input)="existingOddsInput.set(asValue($event))"
        />
      </div>
      <div class="controls">
        <input
          class="dg-input"
          type="number"
          step="0.01"
          placeholder="hedge / lay odds"
          [value]="hedgeOddsInput()"
          (input)="hedgeOddsInput.set(asValue($event))"
        />
      </div>
      <label class="muted">
        <input
          type="checkbox"
          [checked]="useExchangeLay()"
          (change)="useExchangeLay.set(asChecked($event))"
        />
        exchange lay (with commission), instead of a plain back bet
      </label>
      @if (useExchangeLay()) {
        <input
          class="dg-input"
          type="number"
          step="1"
          placeholder="commission %"
          [value]="commissionInput()"
          (input)="commissionInput.set(asValue($event))"
        />
      }

      @if (result(); as r) {
        <span class="muted">
          {{ useExchangeLay() ? 'lay stake' : 'hedge stake' }}
          <span class="metric">{{ r.stake | number: '1.2-2' }}</span>
        </span>
        <span
          class="pill"
          [class.ok]="r.guaranteedProfit >= 0"
          [class.warn]="r.guaranteedProfit < 0"
        >
          guaranteed profit {{ r.guaranteedProfit | number: '1.2-2' }}
        </span>
        @if (r.liability !== undefined) {
          <span class="muted">
            liability
            <span class="metric">{{ r.liability | number: '1.2-2' }}</span>
          </span>
        }
      } @else {
        <span class="pill warn"
          >enter a positive stake, odds &gt; 1, and (if using exchange lay) a
          commission % in [0, 100)</span
        >
      }
    </dg-demo-card>
  `,
})
export class BettingMathHedgeDemo {
  protected readonly existingStakeInput = signal('10');
  protected readonly existingOddsInput = signal('5.00');
  protected readonly hedgeOddsInput = signal('2.00');
  protected readonly useExchangeLay = signal(false);
  protected readonly commissionInput = signal('5');

  protected readonly result = computed(() => {
    const existingStake = Number(this.existingStakeInput());
    const existingOdds = Number(this.existingOddsInput());
    const hedgeOdds = Number(this.hedgeOddsInput());
    const useExchangeLay = this.useExchangeLay();
    const commission = Number(this.commissionInput());

    if (
      !Number.isFinite(existingStake) ||
      existingStake <= 0 ||
      !Number.isFinite(existingOdds) ||
      existingOdds <= 1 ||
      !Number.isFinite(hedgeOdds) ||
      hedgeOdds <= 1 ||
      (useExchangeLay &&
        (!Number.isFinite(commission) || commission < 0 || commission >= 100))
    ) {
      return undefined;
    }

    try {
      if (useExchangeLay) {
        const { layStake, liability, guaranteedProfit } =
          calculateExchangeLayStake(
            fractionFromNumber(existingStake),
            fractionFromNumber(existingOdds),
            fractionFromNumber(hedgeOdds),
            divideFractions(fractionFromNumber(commission), fraction(100)),
          );
        return {
          stake: fractionToNumber(layStake),
          liability: fractionToNumber(liability),
          guaranteedProfit: fractionToNumber(guaranteedProfit),
        };
      }

      const { hedgeStake, guaranteedProfit } = calculateHedgeStake(
        fractionFromNumber(existingStake),
        fractionFromNumber(existingOdds),
        fractionFromNumber(hedgeOdds),
      );
      return {
        stake: fractionToNumber(hedgeStake),
        liability: undefined,
        guaranteedProfit: fractionToNumber(guaranteedProfit),
      };
    } catch {
      return undefined;
    }
  });

  protected asValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected asChecked(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
  }
}
