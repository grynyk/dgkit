import { ChangeDetectionStrategy, Component } from '@angular/core';

import { BettingMathAffiliateDemo } from './demos/betting-math-affiliate-demo';
import { BettingMathDemo } from './demos/betting-math-demo';
import { BettingMathMarketDemo } from './demos/betting-math-market-demo';
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
    BettingMathAffiliateDemo,
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
      <dg-betting-math-affiliate-demo />
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
