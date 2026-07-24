import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { injectClipboard } from '@dgkit/clipboard';

import { DemoCard } from '../ui/demo-card';

@Component({
  selector: 'dg-clipboard-demo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoCard],
  template: `
    <dg-demo-card
      pkg="clipboard"
      blurb="Copy with signal-based status. The status auto-resets after 2s."
    >
      <input
        class="dg-input"
        [value]="value()"
        (input)="value.set(asValue($event))"
      />

      <div class="controls">
        <button
          class="dg-btn"
          (click)="clipboard.copy(value())"
          [disabled]="!clipboard.isSupported()"
        >
          Copy
        </button>
        <span
          class="pill"
          [class.ok]="clipboard.status() === 'copied'"
          [class.warn]="clipboard.status() === 'failed'"
        >
          {{ clipboard.status() }}
        </span>
      </div>

      @if (clipboard.copied(); as copied) {
        <span class="muted">last copied: {{ copied }}</span>
      }
      <span class="muted">supported: {{ clipboard.isSupported() }}</span>
    </dg-demo-card>
  `,
})
export class ClipboardDemo {
  protected readonly value = signal('https://github.com/grynyk/dgkit');
  protected readonly clipboard = injectClipboard();

  protected asValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }
}
