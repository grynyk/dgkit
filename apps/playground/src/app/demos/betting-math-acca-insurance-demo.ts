import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import {
  calculateAccaInsuranceExpectedValue,
  divideFractions,
  fraction,
  fractionFromNumber,
  fractionToNumber,
  type ParlayLeg,
} from '@dgkit/betting-math';

import { DemoCard } from '../ui/demo-card';

@Component({
  selector: 'dg-betting-math-acca-insurance-demo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoCard, DecimalPipe],
  template: `
    <dg-demo-card
      pkg="betting-math"
      blurb="Acca insurance — expected value of a refund if just one leg of a three-leg accumulator lets you down."
    >
      <div class="controls">
        <input
          class="dg-input"
          type="number"
          step="1"
          placeholder="leg 1 probability %"
          [value]="leg1ProbabilityInput()"
          (input)="leg1ProbabilityInput.set(asValue($event))"
        />
        <input
          class="dg-input"
          type="number"
          step="0.01"
          placeholder="leg 1 odds"
          [value]="leg1OddsInput()"
          (input)="leg1OddsInput.set(asValue($event))"
        />
      </div>
      <div class="controls">
        <input
          class="dg-input"
          type="number"
          step="1"
          placeholder="leg 2 probability %"
          [value]="leg2ProbabilityInput()"
          (input)="leg2ProbabilityInput.set(asValue($event))"
        />
        <input
          class="dg-input"
          type="number"
          step="0.01"
          placeholder="leg 2 odds"
          [value]="leg2OddsInput()"
          (input)="leg2OddsInput.set(asValue($event))"
        />
      </div>
      <div class="controls">
        <input
          class="dg-input"
          type="number"
          step="1"
          placeholder="leg 3 probability %"
          [value]="leg3ProbabilityInput()"
          (input)="leg3ProbabilityInput.set(asValue($event))"
        />
        <input
          class="dg-input"
          type="number"
          step="0.01"
          placeholder="leg 3 odds"
          [value]="leg3OddsInput()"
          (input)="leg3OddsInput.set(asValue($event))"
        />
      </div>
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
          placeholder="refund value if 1 leg loses"
          [value]="refundValueInput()"
          (input)="refundValueInput.set(asValue($event))"
        />
      </div>

      @if (result(); as r) {
        <span
          class="pill"
          [class.ok]="r.expectedValue > 0"
          [class.warn]="r.expectedValue <= 0"
        >
          expected value {{ r.expectedValue | number: '1.2-2' }}
        </span>
        <span class="muted">
          win probability
          <span class="metric"
            >{{ r.winProbabilityPercent | number: '1.2-2' }}%</span
          >
        </span>
        <span class="muted">
          insurance-triggers probability
          <span class="metric"
            >{{ r.insuranceProbabilityPercent | number: '1.2-2' }}%</span
          >
        </span>
      } @else {
        <span class="pill warn"
          >enter each leg's probability in (0, 100] and odds &gt; 1, plus a
          positive stake and a refund value &gt;= 0</span
        >
      }
    </dg-demo-card>
  `,
})
export class BettingMathAccaInsuranceDemo {
  protected readonly leg1ProbabilityInput = signal('55');
  protected readonly leg1OddsInput = signal('2.00');
  protected readonly leg2ProbabilityInput = signal('60');
  protected readonly leg2OddsInput = signal('1.90');
  protected readonly leg3ProbabilityInput = signal('58');
  protected readonly leg3OddsInput = signal('2.05');
  protected readonly stakeInput = signal('100');
  protected readonly refundValueInput = signal('80');

  protected readonly result = computed(() => {
    const rawLegs = [
      [this.leg1ProbabilityInput(), this.leg1OddsInput()],
      [this.leg2ProbabilityInput(), this.leg2OddsInput()],
      [this.leg3ProbabilityInput(), this.leg3OddsInput()],
    ].map(([probability, odds]) => ({
      probability: Number(probability),
      odds: Number(odds),
    }));
    const stake = Number(this.stakeInput());
    const refundValue = Number(this.refundValueInput());

    const legsValid = rawLegs.every(
      ({ probability, odds }) =>
        Number.isFinite(probability) &&
        probability > 0 &&
        probability <= 100 &&
        Number.isFinite(odds) &&
        odds > 1,
    );
    if (
      !legsValid ||
      !Number.isFinite(stake) ||
      stake <= 0 ||
      !Number.isFinite(refundValue) ||
      refundValue < 0
    ) {
      return undefined;
    }

    try {
      const legs: ParlayLeg[] = rawLegs.map(({ probability, odds }) => ({
        trueProbability: divideFractions(
          fractionFromNumber(probability),
          fraction(100),
        ),
        decimalOdds: fractionFromNumber(odds),
      }));

      const result = calculateAccaInsuranceExpectedValue(
        legs,
        fractionFromNumber(stake),
        1,
        fractionFromNumber(refundValue),
      );

      return {
        expectedValue: fractionToNumber(result.expectedValue),
        winProbabilityPercent: fractionToNumber(result.winProbability) * 100,
        insuranceProbabilityPercent:
          fractionToNumber(result.insuranceProbability) * 100,
      };
    } catch {
      return undefined;
    }
  });

  protected asValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }
}
