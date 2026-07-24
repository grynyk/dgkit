import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  viewChild,
} from '@angular/core';
import { injectIntersectionObserver } from '@dgkit/intersection-observer';

import { DemoCard } from '../ui/demo-card';

@Component({
  selector: 'dg-intersection-observer-demo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoCard, DecimalPipe],
  template: `
    <dg-demo-card
      pkg="intersection-observer"
      blurb="Visibility as signals. Scroll the panel so the anchor enters view."
    >
      <div class="scroller">
        <div class="spacer">scroll ↓</div>
        <div #anchor class="anchor" [class.on]="visibility.isIntersecting()">
          {{ visibility.isIntersecting() ? 'in view' : 'anchor' }}
        </div>
        <div class="spacer">↑ scroll</div>
      </div>
      <div class="metric">ratio {{ visibility.ratio() | number: '1.0-2' }}</div>
      <span class="muted">
        threshold [0, .25, .5, .75, 1] ·
        <span class="pill" [class.ok]="visibility.isIntersecting()">
          {{ visibility.isIntersecting() ? 'intersecting' : 'hidden' }}
        </span>
      </span>
    </dg-demo-card>
  `,
  styles: `
    .scroller {
      height: 130px;
      overflow-y: auto;
      border: 1px solid #d7dee6;
      border-radius: 8px;
      background: #f5f6ff;
    }
    .spacer {
      height: 120px;
      display: grid;
      place-items: center;
      color: #9aa4b2;
      font-size: 0.8rem;
    }
    .anchor {
      padding: 0.6rem;
      text-align: center;
      font-size: 0.85rem;
      background: #c5cae9;
      color: #283593;
      transition: background 0.2s;
    }
    .anchor.on {
      background: #43a047;
      color: #fff;
    }
  `,
})
export class IntersectionObserverDemo {
  private readonly anchor = viewChild<ElementRef<HTMLElement>>('anchor');

  protected readonly visibility = injectIntersectionObserver(this.anchor, {
    threshold: [0, 0.25, 0.5, 0.75, 1],
  });
}
