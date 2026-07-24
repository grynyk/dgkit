import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  viewChild,
} from '@angular/core';
import { injectResizeObserver } from '@dgkit/resize-observer';

import { DemoCard } from '../ui/demo-card';

@Component({
  selector: 'dg-resize-observer-demo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoCard, DecimalPipe],
  template: `
    <dg-demo-card
      pkg="resize-observer"
      blurb="Element size as signals. Drag the box's corner to resize it."
    >
      <div #box class="box">Resize me ↘</div>
      <div class="metric">
        {{ size.width() | number: '1.0-0' }} ×
        {{ size.height() | number: '1.0-0' }} px
      </div>
      <span class="muted">
        border-box · supported:
        <span class="pill" [class.ok]="size.isSupported()">
          {{ size.isSupported() }}
        </span>
      </span>
    </dg-demo-card>
  `,
  styles: `
    .box {
      resize: both;
      overflow: auto;
      width: 190px;
      height: 110px;
      min-width: 90px;
      min-height: 60px;
      display: grid;
      place-items: center;
      border: 2px dashed #1a237e;
      border-radius: 8px;
      background: #f5f6ff;
      color: #3949ab;
      font-size: 0.85rem;
      user-select: none;
    }
  `,
})
export class ResizeObserverDemo {
  private readonly box = viewChild<ElementRef<HTMLElement>>('box');

  protected readonly size = injectResizeObserver(this.box, {
    box: 'border-box',
    debounce: 30,
  });
}
