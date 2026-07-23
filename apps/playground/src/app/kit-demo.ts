import { DecimalPipe } from '@angular/common';
import type { ElementRef } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  signal,
  viewChild,
} from '@angular/core';
import { injectClipboard } from '@dgkit/clipboard';
import { fileSize, middleTruncate } from '@dgkit/format';
import { injectIntersectionObserver } from '@dgkit/intersection-observer';
import { injectResizeObserver } from '@dgkit/resize-observer';
import { signalHistory } from '@dgkit/signal-history';

const HASH = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';

/**
 * Manual verification surface for the signal-based @dgkit APIs. Everything here
 * is zoneless-friendly: native callbacks write signals, nothing calls NgZone.
 */
@Component({
  selector: 'dg-kit-demo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe],
  template: `
    <section class="panel">
      <h2>injectResizeObserver</h2>
      <div #sizeBox class="resizable">Drag my corner</div>
      <code>
        {{ size.width() | number: '1.0-0' }} ×
        {{ size.height() | number: '1.0-0' }}
      </code>
      <small>supported: {{ size.isSupported() }}</small>
    </section>

    <section class="panel">
      <h2>injectIntersectionObserver</h2>
      <div class="scroller">
        <div class="spacer">scroll down ↓</div>
        <div #anchor class="anchor">anchor</div>
        <div class="spacer"></div>
      </div>
      <code>{{ visibility.isIntersecting() ? 'visible' : 'hidden' }}</code>
      <small>ratio: {{ visibility.ratio() | number: '1.0-2' }}</small>
    </section>

    <section class="panel">
      <h2>signalHistory</h2>
      <input
        type="text"
        [value]="title()"
        (input)="onTitle($event)"
        placeholder="Type, then undo…"
      />
      <div class="row">
        <button (click)="history.undo()" [disabled]="!history.canUndo()">
          Undo
        </button>
        <button (click)="history.redo()" [disabled]="!history.canRedo()">
          Redo
        </button>
      </div>
      <small
        >{{ history.past().length }} past /
        {{ history.future().length }} future</small
      >
    </section>

    <section class="panel">
      <h2>clipboard + format</h2>
      <code>{{ shortHash }}</code>
      <button (click)="clipboard.copy(hash)">
        {{ clipboard.status() === 'copied' ? 'Copied!' : 'Copy hash' }}
      </button>
      <small>{{ prettySize }} · status: {{ clipboard.status() }}</small>
    </section>
  `,
  styleUrl: './kit-demo.css',
})
export class KitDemo {
  private readonly sizeBox = viewChild<ElementRef<HTMLElement>>('sizeBox');
  private readonly anchor = viewChild<ElementRef<HTMLElement>>('anchor');

  protected readonly size = injectResizeObserver(this.sizeBox);
  protected readonly visibility = injectIntersectionObserver(this.anchor, {
    threshold: [0, 0.5, 1],
  });

  protected readonly title = signal('');
  protected readonly history = signalHistory(this.title, { debounce: 300 });

  protected readonly clipboard = injectClipboard();

  protected readonly hash = HASH;
  protected readonly shortHash = middleTruncate(HASH, 6, 4);
  protected readonly prettySize = fileSize(1_048_576);

  protected onTitle(event: Event): void {
    this.title.set((event.target as HTMLInputElement).value);
  }
}
