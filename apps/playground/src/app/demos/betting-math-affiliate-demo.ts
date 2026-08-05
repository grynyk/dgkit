import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import {
  calculateHybridCommission,
  divideFractions,
  fraction,
  fractionFromNumber,
  fractionToNumber,
} from '@dgkit/betting-math';

import { DemoCard } from '../ui/demo-card';

@Component({
  selector: 'dg-betting-math-affiliate-demo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoCard, DecimalPipe],
  template: `
    <dg-demo-card
      pkg="betting-math"
      blurb="Hybrid affiliate commission — CPA per FTD plus a RevShare cut of NGR."
    >
      <div class="controls">
        <input
          class="dg-input"
          type="number"
          step="1"
          placeholder="qualifying FTDs"
          [value]="countInput()"
          (input)="countInput.set(asValue($event))"
        />
        <input
          class="dg-input"
          type="number"
          placeholder="CPA rate ($)"
          [value]="cpaInput()"
          (input)="cpaInput.set(asValue($event))"
        />
      </div>
      <div class="controls">
        <input
          class="dg-input"
          type="number"
          placeholder="NGR ($)"
          [value]="ngrInput()"
          (input)="ngrInput.set(asValue($event))"
        />
        <input
          class="dg-input"
          type="number"
          placeholder="RevShare %"
          [value]="revShareInput()"
          (input)="revShareInput.set(asValue($event))"
        />
      </div>

      @if (result(); as r) {
        <span class="muted">
          CPA portion
          <span class="metric">{{ r.cpaPortion | number: '1.0-2' }}</span>
        </span>
        <span class="muted">
          RevShare portion
          <span class="metric">{{ r.revSharePortion | number: '1.0-2' }}</span>
        </span>
        <span class="muted">
          total
          <span class="metric">{{ r.total | number: '1.0-2' }}</span>
        </span>
      } @else {
        <span class="pill warn"
          >qualifying FTDs &gt;= 0, RevShare % in [0, 100]</span
        >
      }
    </dg-demo-card>
  `,
})
export class BettingMathAffiliateDemo {
  protected readonly countInput = signal('40');
  protected readonly cpaInput = signal('75');
  protected readonly ngrInput = signal('10000');
  protected readonly revShareInput = signal('15');

  protected readonly result = computed(() => {
    const count = Number(this.countInput());
    const cpaRate = Number(this.cpaInput());
    const ngr = Number(this.ngrInput());
    const revSharePercent = Number(this.revShareInput());

    if (
      !Number.isInteger(count) ||
      count < 0 ||
      !Number.isFinite(cpaRate) ||
      cpaRate < 0 ||
      !Number.isFinite(ngr) ||
      !Number.isFinite(revSharePercent) ||
      revSharePercent < 0 ||
      revSharePercent > 100
    ) {
      return undefined;
    }

    try {
      const commission = calculateHybridCommission({
        qualifyingCount: count,
        cpaRate: fractionFromNumber(cpaRate),
        ngr: fractionFromNumber(ngr),
        revSharePercent: divideFractions(
          fractionFromNumber(revSharePercent),
          fraction(100),
        ),
      });
      return {
        cpaPortion: fractionToNumber(commission.cpaPortion),
        revSharePortion: fractionToNumber(commission.revSharePortion),
        total: fractionToNumber(commission.total),
      };
    } catch {
      return undefined;
    }
  });

  protected asValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }
}
