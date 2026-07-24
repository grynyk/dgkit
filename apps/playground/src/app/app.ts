import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Thin shell: a header and the router outlet. All demos live in their own
 * standalone components under `./demos`, composed by `PlaygroundPage`.
 */
@Component({
  selector: 'dg-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
  template: `
    <header class="shell-header">
      <h1>dgkit playground</h1>
      <p>
        Live previews of every <code>&#64;dgkit</code> package. Each card is a
        standalone component consuming the library from source.
      </p>
    </header>
    <main class="shell-main">
      <router-outlet />
    </main>
  `,
  styles: `
    .shell-header {
      max-width: 1100px;
      margin: 0 auto;
      padding: 2rem 1rem 0.5rem;
    }
    .shell-header h1 {
      margin: 0;
      font-size: 1.6rem;
    }
    .shell-header p {
      color: #5a6672;
      line-height: 1.5;
      max-width: 44rem;
    }
    .shell-main {
      max-width: 1100px;
      margin: 0 auto;
      padding: 1rem 1rem 4rem;
    }
  `,
})
export class App {}
