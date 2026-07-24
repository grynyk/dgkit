import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import {
  enumParam,
  injectRouteState,
  numberParam,
  stringParam,
} from '@dgkit/route-state';

import { DemoCard } from '../ui/demo-card';

@Component({
  selector: 'dg-route-state-demo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoCard],
  template: `
    <dg-demo-card
      pkg="route-state"
      blurb="Query params as typed signals. Edit below and watch the URL — defaults are elided."
    >
      <div class="controls">
        <button
          class="dg-btn secondary"
          (click)="state.page.update((p) => Math.max(1, p - 1))"
        >
          ‹ prev
        </button>
        <span class="metric">page {{ state.page() }}</span>
        <button
          class="dg-btn secondary"
          (click)="state.page.update((p) => p + 1)"
        >
          next ›
        </button>
      </div>

      <input
        class="dg-input"
        placeholder="search…"
        [value]="state.q()"
        (input)="state.q.set(asValue($event))"
      />

      <div class="controls">
        @for (t of tabs; track t) {
          <button
            class="dg-btn"
            [class.secondary]="state.tab() !== t"
            (click)="state.tab.set(t)"
          >
            {{ t }}
          </button>
        }
        <button class="dg-btn secondary" (click)="state.reset()">reset</button>
      </div>

      <code class="muted">{{ query() || '(no query params)' }}</code>
    </dg-demo-card>
  `,
})
export class RouteStateDemo {
  private readonly router = inject(Router);

  protected readonly Math = Math;
  protected readonly tabs = ['overview', 'activity', 'history'] as const;

  protected readonly state = injectRouteState({
    page: numberParam(1),
    q: stringParam(''),
    tab: enumParam(this.tabs, 'overview'),
  });

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected readonly query = computed(() => {
    const index = this.url().indexOf('?');
    return index >= 0 ? this.url().slice(index) : '';
  });

  protected asValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }
}
