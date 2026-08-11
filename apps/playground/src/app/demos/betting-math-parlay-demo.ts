import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import {
  calculateParlayExpectedValue,
  calculateParlayKellyStake,
  divideFractions,
  fraction,
  fractionFromNumber,
  fractionToNumber,
  type ParlayLeg,
} from '@dgkit/betting-math';

import { DemoCard } from '../ui/demo-card';

@Component({
  selector: 'dg-betting-math-parlay-demo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoCard, DecimalPipe],
  template: `
    <dg-demo-card
      pkg="betting-math"
      blurb="Parlay EV and Kelly staking — a three-leg accumulator collapsed to one equivalent price."
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
          placeholder="bankroll"
          [value]="bankrollInput()"
          (input)="bankrollInput.set(asValue($event))"
        />
      </div>

      @if (result(); as r) {
        <span class="pill" [class.ok]="r.edge > 0" [class.warn]="r.edge <= 0">
          combined odds {{ r.combinedOdds | number: '1.2-2' }} · edge
          {{ r.edgePercent | number: '1.2-2' }}%
        </span>
        <span class="muted">
          expected value
          <span class="metric">{{ r.expectedValue | number: '1.2-2' }}</span>
        </span>
        <span class="muted">
          full-Kelly stake
          <span class="metric">{{ r.recommendedStake | number: '1.2-2' }}</span>
        </span>
      } @else {
        <span class="pill warn"
          >enter each leg's probability in (0, 100] and odds &gt; 1, plus a
          positive stake and bankroll</span
        >
      }
    </dg-demo-card>
  `,
})
export class BettingMathParlayDemo {
  protected readonly leg1ProbabilityInput = signal('55');
  protected readonly leg1OddsInput = signal('2.00');
  protected readonly leg2ProbabilityInput = signal('60');
  protected readonly leg2OddsInput = signal('1.90');
  protected readonly leg3ProbabilityInput = signal('58');
  protected readonly leg3OddsInput = signal('2.05');
  protected readonly stakeInput = signal('100');
  protected readonly bankrollInput = signal('1000');

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
    const bankroll = Number(this.bankrollInput());

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
      !Number.isFinite(bankroll) ||
      bankroll <= 0
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

      const ev = calculateParlayExpectedValue(legs, fractionFromNumber(stake));
      const kelly = calculateParlayKellyStake(
        legs,
        fractionFromNumber(bankroll),
      );

      return {
        combinedOdds: fractionToNumber(ev.price.odds),
        edge: fractionToNumber(ev.edge),
        edgePercent: fractionToNumber(ev.edge) * 100,
        expectedValue: fractionToNumber(ev.expectedValue),
        recommendedStake: fractionToNumber(kelly.recommendedStake),
      };
    } catch {
      return undefined;
    }
  });

  protected asValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }
}
