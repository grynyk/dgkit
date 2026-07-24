import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { downloadBlob, isDownloadSupported } from '@dgkit/file-download';

import { DemoCard } from '../ui/demo-card';

@Component({
  selector: 'dg-file-download-demo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoCard],
  template: `
    <dg-demo-card
      pkg="file-download"
      blurb="Trigger a real browser download from a Blob, with no memory leaks."
    >
      <input
        class="dg-input"
        placeholder="File content…"
        [value]="content()"
        (input)="content.set(asValue($event))"
      />

      <div class="controls">
        <button class="dg-btn" (click)="download()">⬇ download .txt</button>
        <span class="pill" [class.ok]="supported">
          {{ supported ? 'supported' : 'unsupported' }}
        </span>
      </div>

      <span class="muted">{{ downloads() }} download(s) triggered</span>
    </dg-demo-card>
  `,
})
export class FileDownloadDemo {
  protected readonly supported = isDownloadSupported();
  protected readonly content = signal('Hello from @dgkit/file-download!');
  protected readonly downloads = signal(0);

  protected download(): void {
    downloadBlob(
      'dgkit-demo.txt',
      new Blob([this.content()], { type: 'text/plain' }),
    );
    this.downloads.update((n) => n + 1);
  }

  protected asValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }
}
