import { ChangeDetectionStrategy, Component } from '@angular/core';
import { injectStorageSignal } from '@dgkit/signal-storage';

import { DemoCard } from '../ui/demo-card';

@Component({
  selector: 'dg-signal-storage-demo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoCard],
  template: `
    <dg-demo-card
      pkg="signal-storage"
      blurb="A signal backed by localStorage. Reload the page, or open it in another tab — it stays in sync."
    >
      <input
        class="dg-input"
        placeholder="Type a note…"
        [value]="note()"
        (input)="note.set(asValue($event))"
      />

      <div class="controls">
        <button class="dg-btn secondary" (click)="note.remove()">clear</button>
        <span class="pill" [class.ok]="note.isSupported()">
          {{ note.isSupported() ? 'persisted' : 'in-memory only' }}
        </span>
      </div>

      <span class="muted">
        key: "playground-note" · reload or open another tab to see it sync
      </span>
    </dg-demo-card>
  `,
})
export class SignalStorageDemo {
  protected readonly note = injectStorageSignal('playground-note', '');

  protected asValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }
}
