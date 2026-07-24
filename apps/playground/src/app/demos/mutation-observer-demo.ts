import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  MutationObserverDirective,
  type DgMutationEvent,
} from '@dgkit/mutation-observer';

import { DemoCard } from '../ui/demo-card';

@Component({
  selector: 'dg-mutation-observer-demo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoCard, MutationObserverDirective],
  template: `
    <dg-demo-card
      pkg="mutation-observer"
      blurb="DOM mutations as events. Add or remove rows and watch the observer fire."
    >
      <div class="controls">
        <button class="dg-btn" (click)="addRow()">+ add row</button>
        <button
          class="dg-btn secondary"
          (click)="removeRow()"
          [disabled]="rows().length === 0"
        >
          − remove row
        </button>
      </div>

      <ul
        dgMutationObserver
        [mutationChildList]="true"
        (dgMutation)="onMutation($event)"
        class="list"
      >
        @for (row of rows(); track row) {
          <li>row {{ row }}</li>
        }
      </ul>

      <div class="metric">{{ batches() }} batch(es) observed</div>
      <span class="muted">last batch: {{ lastRecordCount() }} record(s)</span>
    </dg-demo-card>
  `,
  styles: `
    .list {
      margin: 0;
      padding: 0.5rem 0.5rem 0.5rem 1.5rem;
      min-height: 2.5rem;
      border: 1px solid #d7dee6;
      border-radius: 8px;
      background: #f5f6ff;
      font-size: 0.85rem;
      color: #3949ab;
    }
  `,
})
export class MutationObserverDemo {
  private nextRow = 3;

  protected readonly rows = signal([1, 2]);
  protected readonly batches = signal(0);
  protected readonly lastRecordCount = signal(0);

  protected addRow(): void {
    this.rows.update((r) => [...r, this.nextRow++]);
  }

  protected removeRow(): void {
    this.rows.update((r) => r.slice(0, -1));
  }

  protected onMutation(event: DgMutationEvent): void {
    this.batches.update((n) => n + 1);
    this.lastRecordCount.set(event.records.length);
  }
}
