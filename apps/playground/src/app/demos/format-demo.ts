import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import { fileSize, middleTruncate, truncate } from '@dgkit/format';

import { DemoCard } from '../ui/demo-card';

@Component({
  selector: 'dg-format-demo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoCard],
  template: `
    <dg-demo-card
      pkg="format"
      blurb="Grapheme-safe formatters. Try emoji or a long hash — nothing splits."
    >
      <input
        class="dg-input"
        [value]="text()"
        (input)="text.set(asValue($event))"
      />
      <span class="muted">middleTruncate(v, 6, 4)</span>
      <code class="metric">{{ middle() }}</code>
      <span class="muted">truncate(v, 18)</span>
      <code class="metric">{{ end() }}</code>

      <label class="muted" for="bytes">
        fileSize({{ bytes() }}) = <b>{{ size() }}</b>
      </label>
      <input
        id="bytes"
        class="dg-input"
        type="range"
        min="0"
        max="40"
        [value]="exp()"
        (input)="exp.set(+asValue($event))"
      />
    </dg-demo-card>
  `,
})
export class FormatDemo {
  protected readonly text = signal(
    '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
  );
  protected readonly exp = signal(20);

  protected readonly middle = computed(() => middleTruncate(this.text(), 6, 4));
  protected readonly end = computed(() => truncate(this.text(), 18));
  protected readonly bytes = computed(() => 2 ** this.exp());
  protected readonly size = computed(() => fileSize(this.bytes()));

  protected asValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }
}
