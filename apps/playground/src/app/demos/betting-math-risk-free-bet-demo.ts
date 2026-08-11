import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import {
  calculateRiskFreeBetLayStake,
  divideFractions,
  fraction,
  fractionFromNumber,
  fractionToNumber,
} from '@dgkit/betting-math';

import { DemoCard } from '../ui/demo-card';

@Component({
  selector: 'dg-betting-math-risk-free-bet-demo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoCard, DecimalPipe],
  template: `
    <dg-demo-card
      pkg="betting-math"
      blurb="Risk-free bet — lay less than a plain qualifying bet, funded by the refund's free-bet value."
    >
      <div class="controls">
        <input
          class="dg-input"
          type="number"
          placeholder="back stake"
          [value]="backStakeInput()"
          (input)="backStakeInput.set(asValue($event))"
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
      <div class="controls">
        <input
          class="dg-input"
          type="number"
          placeholder="refund cap"
          [value]="refundCapInput()"
          (input)="refundCapInput.set(asValue($event))"
        />
        <input
          class="dg-input"
          type="number"
          step="0.01"
          placeholder="refund back odds"
          [value]="refundBackOddsInput()"
          (input)="refundBackOddsInput.set(asValue($event))"
        />
      </div>
      <div class="controls">
        <input
          class="dg-input"
          type="number"
          step="0.01"
          placeholder="refund lay odds"
          [value]="refundLayOddsInput()"
          (input)="refundLayOddsInput.set(asValue($event))"
        />
        <input
          class="dg-input"
          type="number"
          step="1"
          placeholder="refund commission %"
          [value]="refundCommissionInput()"
          (input)="refundCommissionInput.set(asValue($event))"
        />
      </div>

      @if (result(); as r) {
        <span
          class="pill"
          [class.ok]="r.guaranteedProfit >= 0"
          [class.warn]="r.guaranteedProfit < 0"
        >
          guaranteed profit {{ r.guaranteedProfit | number: '1.2-2' }}
        </span>
        <span class="muted">
          lay stake
          <span class="metric">{{ r.layStake | number: '1.2-2' }}</span>
        </span>
        <span class="muted">
          refund value
          <span class="metric">{{ r.refundValue | number: '1.2-2' }}</span>
        </span>
      } @else {
        <span class="pill warn"
          >enter positive stakes/odds &gt; 1, commissions in [0, 100), and a
          refund cap &gt;= 0</span
        >
      }
    </dg-demo-card>
  `,
})
export class BettingMathRiskFreeBetDemo {
  protected readonly backStakeInput = signal('100');
  protected readonly backOddsInput = signal('2.00');
  protected readonly layOddsInput = signal('2.00');
  protected readonly commissionInput = signal('0');
  protected readonly refundCapInput = signal('100');
  protected readonly refundBackOddsInput = signal('5.00');
  protected readonly refundLayOddsInput = signal('5.00');
  protected readonly refundCommissionInput = signal('0');

  protected readonly result = computed(() => {
    const backStake = Number(this.backStakeInput());
    const backOdds = Number(this.backOddsInput());
    const layOdds = Number(this.layOddsInput());
    const commission = Number(this.commissionInput());
    const refundCap = Number(this.refundCapInput());
    const refundBackOdds = Number(this.refundBackOddsInput());
    const refundLayOdds = Number(this.refundLayOddsInput());
    const refundCommission = Number(this.refundCommissionInput());

    if (
      !Number.isFinite(backStake) ||
      backStake <= 0 ||
      !Number.isFinite(backOdds) ||
      backOdds <= 1 ||
      !Number.isFinite(layOdds) ||
      layOdds <= 1 ||
      !Number.isFinite(commission) ||
      commission < 0 ||
      commission >= 100 ||
      !Number.isFinite(refundCap) ||
      refundCap < 0 ||
      !Number.isFinite(refundBackOdds) ||
      refundBackOdds <= 1 ||
      !Number.isFinite(refundLayOdds) ||
      refundLayOdds <= 1 ||
      !Number.isFinite(refundCommission) ||
      refundCommission < 0 ||
      refundCommission >= 100
    ) {
      return undefined;
    }

    try {
      const result = calculateRiskFreeBetLayStake({
        backStake: fractionFromNumber(backStake),
        backOdds: fractionFromNumber(backOdds),
        layOdds: fractionFromNumber(layOdds),
        commission: divideFractions(
          fractionFromNumber(commission),
          fraction(100),
        ),
        refundCap: fractionFromNumber(refundCap),
        refundBackOdds: fractionFromNumber(refundBackOdds),
        refundLayOdds: fractionFromNumber(refundLayOdds),
        refundCommission: divideFractions(
          fractionFromNumber(refundCommission),
          fraction(100),
        ),
      });
      return {
        layStake: fractionToNumber(result.layStake),
        refundValue: fractionToNumber(result.refundValue),
        guaranteedProfit: fractionToNumber(result.guaranteedProfit),
      };
    } catch {
      return undefined;
    }
  });

  protected asValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }
}
