import { fileURLToPath } from 'node:url';
import angular from '@analogjs/vite-plugin-angular';
import { defineConfig } from 'vite';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [angular()],
  resolve: {
    alias: {
      // Consume the library from source so the playground always reflects the
      // latest package code without a rebuild.
      '@dgkit/resize-observer': fileURLToPath(
        new URL('../../packages/resize-observer/src/index.ts', import.meta.url),
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
