import { ChangeDetectionStrategy, Component } from '@angular/core';

import { BettingMathAccaInsuranceDemo } from './demos/betting-math-acca-insurance-demo';
import { BettingMathAffiliateDemo } from './demos/betting-math-affiliate-demo';
import { BettingMathArbitrageDemo } from './demos/betting-math-arbitrage-demo';
import { BettingMathDemo } from './demos/betting-math-demo';
import { BettingMathEvDemo } from './demos/betting-math-ev-demo';
import { BettingMathFreeBetDemo } from './demos/betting-math-free-bet-demo';
import { BettingMathHedgeDemo } from './demos/betting-math-hedge-demo';
import { BettingMathKellyDemo } from './demos/betting-math-kelly-demo';
import { BettingMathMarketDemo } from './demos/betting-math-market-demo';
import { BettingMathParlayDemo } from './demos/betting-math-parlay-demo';
import { BettingMathProfitBoostDemo } from './demos/betting-math-profit-boost-demo';
import { BettingMathRiskFreeBetDemo } from './demos/betting-math-risk-free-bet-demo';
import { ClipboardDemo } from './demos/clipboard-demo';
import { BlobSaverDemo } from './demos/blob-saver-demo';
import { ComboboxDemo } from './demos/combobox-demo';
import { FormatDemo } from './demos/format-demo';
import { IntersectionObserverDemo } from './demos/intersection-observer-demo';
import { MutationObserverDemo } from './demos/mutation-observer-demo';
import { ResizeObserverDemo } from './demos/resize-observer-demo';
import { RouteStateDemo } from './demos/route-state-demo';
import { SignalHistoryDemo } from './demos/signal-history-demo';
import { SignalStorageDemo } from './demos/signal-storage-demo';

/**
 * The demos page. Each package lives in its own standalone component; this
 * page only lays them out in a responsive grid.
 */
@Component({
  selector: 'dg-playground-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ResizeObserverDemo,
    IntersectionObserverDemo,
    MutationObserverDemo,
    RouteStateDemo,
    SignalStorageDemo,
    SignalHistoryDemo,
    ClipboardDemo,
    FormatDemo,
    BlobSaverDemo,
    ComboboxDemo,
    BettingMathDemo,
    BettingMathMarketDemo,
    BettingMathArbitrageDemo,
    BettingMathAffiliateDemo,
    BettingMathEvDemo,
    BettingMathKellyDemo,
    BettingMathParlayDemo,
    BettingMathHedgeDemo,
    BettingMathFreeBetDemo,
    BettingMathProfitBoostDemo,
    BettingMathRiskFreeBetDemo,
    BettingMathAccaInsuranceDemo,
  ],
  template: `
    <div class="grid">
      <dg-resize-observer-demo />
      <dg-intersection-observer-demo />
      <dg-mutation-observer-demo />
      <dg-route-state-demo />
      <dg-signal-storage-demo />
      <dg-signal-history-demo />
      <dg-clipboard-demo />
      <dg-format-demo />
      <dg-blob-saver-demo />
      <dg-combobox-demo />
      <dg-betting-math-demo />
      <dg-betting-math-market-demo />
      <dg-betting-math-arbitrage-demo />
      <dg-betting-math-affiliate-demo />
      <dg-betting-math-ev-demo />
      <dg-betting-math-kelly-demo />
      <dg-betting-math-parlay-demo />
      <dg-betting-math-hedge-demo />
      <dg-betting-math-free-bet-demo />
      <dg-betting-math-profit-boost-demo />
      <dg-betting-math-risk-free-bet-demo />
      <dg-betting-math-acca-insurance-demo />
    </div>
  `,
  styles: `
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
      align-items: start;
    }
  `,
})
export class PlaygroundPage {}
