import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Presentational wrapper giving every package demo a consistent frame:
 * the package name, a one-line blurb, and a projected live preview.
 */
@Component({
  selector: 'dg-demo-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="card">
      <header>
        <h2>
          <code>&#64;dgkit/{{ pkg() }}</code>
        </h2>
        <p>{{ blurb() }}</p>
      </header>
      <div class="preview">
        <ng-content />
      </div>
    </article>
  `,
  styleUrl: './demo-card.css',
})
export class DemoCard {
  readonly pkg = input.required<string>();
  readonly blurb = input.required<string>();
}
