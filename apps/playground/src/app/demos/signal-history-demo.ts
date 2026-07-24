import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { signalHistory } from '@dgkit/signal-history';

import { DemoCard } from '../ui/demo-card';

@Component({
  selector: 'dg-signal-history-demo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoCard],
  template: `
    <dg-demo-card
      pkg="signal-history"
      blurb="Undo/redo for any signal. Type (keystrokes coalesce for 300ms), then undo."
    >
      <input
        class="dg-input"
        placeholder="Type something…"
        [value]="text()"
        (input)="text.set(asValue($event))"
      />

      <div class="controls">
        <button
          class="dg-btn"
          (click)="history.undo()"
          [disabled]="!history.canUndo()"
        >
          ↶ undo
        </button>
        <button
          class="dg-btn"
          (click)="history.redo()"
          [disabled]="!history.canRedo()"
        >
          ↷ redo
        </button>
        <button class="dg-btn secondary" (click)="history.reset()">
          reset
        </button>
      </div>

      <span class="muted">
        current: <span class="metric">{{ text() || '—' }}</span>
      </span>
      <span class="muted">
        {{ history.past().length }} past · {{ history.future().length }} future
      </span>
    </dg-demo-card>
  `,
})
export class SignalHistoryDemo {
  protected readonly text = signal('');
  protected readonly history = signalHistory(this.text, { debounce: 300 });

  protected asValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }
}
