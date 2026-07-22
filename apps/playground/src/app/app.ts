import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  signal,
  type WritableSignal,
} from '@angular/core';
import {
  type DgResizeEvent,
  ResizeObserverDirective,
} from '@dgkit/resize-observer';

interface DemoState {
  readonly width: number;
  readonly height: number;
  readonly count: number;
  readonly initial: boolean;
}

const EMPTY: DemoState = { width: 0, height: 0, count: 0, initial: false };

@Component({
  selector: 'dg-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ResizeObserverDirective, DecimalPipe],
  template: `
    <header>
      <h1>@dgkit/resize-observer</h1>
      <p>
        Drag the bottom-right handle of any panel to resize it and watch the
        directive report dimensions. Each panel demonstrates a different input.
      </p>
    </header>

    <main>
      <!-- Basic observation -->
      <section class="demo" dgResizeObserver (dgResize)="update(basic, $event)">
        <h2>Basic</h2>
        @let b = basic();
        <code
          >{{ b.width | number: '1.0-0' }} ×
          {{ b.height | number: '1.0-0' }}</code
        >
        <small>{{ b.count }} event(s)</small>
      </section>

      <!-- Debounced observation -->
      <section
        class="demo"
        dgResizeObserver
        [resizeDebounce]="200"
        (dgResize)="update(debounced, $event)"
      >
        <h2>Debounced (200ms)</h2>
        @let d = debounced();
        <code
          >{{ d.width | number: '1.0-0' }} ×
          {{ d.height | number: '1.0-0' }}</code
        >
        <small>{{ d.count }} event(s)</small>
      </section>

      <!-- Border-box observation -->
      <section
        class="demo padded"
        dgResizeObserver
        [resizeBox]="'border-box'"
        (dgResize)="update(borderBox, $event)"
      >
        <h2>Border-box</h2>
        @let bb = borderBox();
        <code
          >{{ bb.width | number: '1.0-0' }} ×
          {{ bb.height | number: '1.0-0' }}</code
        >
        <small>includes padding + border</small>
      </section>

      <!-- Initial emission -->
      <section
        class="demo"
        dgResizeObserver
        [resizeEmitInitial]="true"
        (dgResize)="update(initial, $event)"
      >
        <h2>Initial emission</h2>
        @let i = initial();
        <code
          >{{ i.width | number: '1.0-0' }} ×
          {{ i.height | number: '1.0-0' }}</code
        >
        <small>first event initial: {{ i.initial }}</small>
      </section>

      <!-- Distinct emission -->
      <section
        class="demo"
        dgResizeObserver
        [resizeDistinct]="true"
        (dgResize)="update(distinct, $event)"
      >
        <h2>Distinct</h2>
        @let ds = distinct();
        <code
          >{{ ds.width | number: '1.0-0' }} ×
          {{ ds.height | number: '1.0-0' }}</code
        >
        <small>{{ ds.count }} distinct event(s)</small>
      </section>
    </main>

    <footer>
      <p>
        SSR-safe: this component imports the directive directly and would render
        without error on the server — the observer is only created in the
        browser.
      </p>
    </footer>
  `,
  styleUrl: './app.css',
})
export class App {
  protected readonly basic = signal<DemoState>(EMPTY);
  protected readonly debounced = signal<DemoState>(EMPTY);
  protected readonly borderBox = signal<DemoState>(EMPTY);
  protected readonly initial = signal<DemoState>(EMPTY);
  protected readonly distinct = signal<DemoState>(EMPTY);

  protected update(
    target: WritableSignal<DemoState>,
    event: DgResizeEvent,
  ): void {
    target.update((state) => ({
      width: event.width,
      height: event.height,
      count: state.count + 1,
      initial: event.initial,
    }));
  }
}
