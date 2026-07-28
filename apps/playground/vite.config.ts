import { fileURLToPath } from 'node:url';
import angular from '@analogjs/vite-plugin-angular';
import { defineConfig } from 'vite';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  // Relative base so the build works under any GitHub Pages subpath
  // (e.g. https://<user>.github.io/<repo>/). Hash routing keeps deep links
  // working without a server-side SPA fallback.
  base: './',
  plugins: [angular()],
  resolve: {
    alias: {
      // Consume the libraries from source so the playground always reflects the
      // latest package code without a rebuild.
      '@dgkit/resize-observer': fileURLToPath(
        new URL('../../packages/resize-observer/src/index.ts', import.meta.url),
      ),
      '@dgkit/intersection-observer': fileURLToPath(
        new URL(
          '../../packages/intersection-observer/src/index.ts',
          import.meta.url,
        ),
      ),
      '@dgkit/mutation-observer': fileURLToPath(
        new URL(
          '../../packages/mutation-observer/src/index.ts',
          import.meta.url,
        ),
      ),
      '@dgkit/clipboard': fileURLToPath(
        new URL('../../packages/clipboard/src/index.ts', import.meta.url),
      ),
      '@dgkit/signal-history': fileURLToPath(
        new URL('../../packages/signal-history/src/index.ts', import.meta.url),
      ),
      '@dgkit/route-state': fileURLToPath(
        new URL('../../packages/route-state/src/index.ts', import.meta.url),
      ),
      '@dgkit/signal-storage': fileURLToPath(
        new URL('../../packages/signal-storage/src/index.ts', import.meta.url),
      ),
      '@dgkit/format': fileURLToPath(
        new URL('../../packages/format/src/index.ts', import.meta.url),
      ),
      '@dgkit/blob-saver': fileURLToPath(
        new URL('../../packages/blob-saver/src/index.ts', import.meta.url),
      ),
      '@dgkit/combobox': fileURLToPath(
        new URL('../../packages/combobox/src/index.ts', import.meta.url),
      ),
      '@dgkit/betting-math': fileURLToPath(
        new URL('../../packages/betting-math/src/index.ts', import.meta.url),
      ),
    },
  },
  build: {
    outDir: fileURLToPath(
      new URL('../../dist/apps/playground', import.meta.url),
    ),
    emptyOutDir: true,
  },
});
