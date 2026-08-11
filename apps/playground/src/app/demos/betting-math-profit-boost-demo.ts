import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import {
  applyProfitBoost,
  divideFractions,
  fraction,
  fractionFromNumber,
  fractionToNumber,
} from '@dgkit/betting-math';

import { DemoCard } from '../ui/demo-card';

@Component({
  selector: 'dg-betting-math-profit-boost-demo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoCard, DecimalPipe],
  template: `
    <dg-demo-card
      pkg="betting-math"
      blurb="Profit boost — extra winnings from a token, optionally capped at a maximum amount."
    >
      <div class="controls">
        <input
          class="dg-input"
          type="number"
          placeholder="stake"
          [value]="stakeInput()"
          (input)="stakeInput.set(asValue($event))"
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
          step="1"
          placeholder="boost %"
          [value]="boostPercentInput()"
          (input)="boostPercentInput.set(asValue($event))"
        />
      </div>
      <label class="muted">
        <input
          type="checkbox"
          [checked]="capped()"
          (change)="capped.set(asChecked($event))"
        />
        cap the extra winnings
      </label>
      @if (capped()) {
        <input
          class="dg-input"
          type="number"
          placeholder="max boost amount"
          [value]="maxBoostAmountInput()"
          (input)="maxBoostAmountInput.set(asValue($event))"
        />
      }

      @if (result(); as r) {
        <span class="pill ok"
          >boosted odds {{ r.boostedOdds | number: '1.2-2' }}</span
        >
        <span class="muted">
          boost amount
          <span class="metric">{{ r.boostAmount | number: '1.2-2' }}</span>
        </span>
        <span class="muted">
          boosted payout
          <span class="metric">{{ r.boostedPayout | number: '1.2-2' }}</span>
        </span>
      } @else {
        <span class="pill warn"
          >enter a positive stake, odds &gt; 1, and a boost % &gt;= 0</span
        >
      }
    </dg-demo-card>
  `,
})
export class BettingMathProfitBoostDemo {
  protected readonly stakeInput = signal('10');
  protected readonly oddsInput = signal('3.00');
  protected readonly boostPercentInput = signal('50');
  protected readonly capped = signal(false);
  protected readonly maxBoostAmountInput = signal('5');

  protected readonly result = computed(() => {
    const stake = Number(this.stakeInput());
    const odds = Number(this.oddsInput());
    const boostPercent = Number(this.boostPercentInput());
    const capped = this.capped();
    const maxBoostAmount = Number(this.maxBoostAmountInput());

    if (
      !Number.isFinite(stake) ||
      stake <= 0 ||
      !Number.isFinite(odds) ||
      odds <= 1 ||
      !Number.isFinite(boostPercent) ||
      boostPercent < 0 ||
      (capped && (!Number.isFinite(maxBoostAmount) || maxBoostAmount < 0))
    ) {
      return undefined;
    }

    try {
      const result = applyProfitBoost({
        stake: fractionFromNumber(stake),
        decimalOdds: fractionFromNumber(odds),
        boostPercent: divideFractions(
          fractionFromNumber(boostPercent),
          fraction(100),
        ),
        maxBoostAmount: capped ? fractionFromNumber(maxBoostAmount) : undefined,
      });
      return {
        boostAmount: fractionToNumber(result.boostAmount),
        boostedPayout: fractionToNumber(result.boostedPayout),
        boostedOdds: fractionToNumber(result.boostedOdds),
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
