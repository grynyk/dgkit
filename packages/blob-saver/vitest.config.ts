/// <reference types="vitest" />
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root,
  test: {
    // Framework-free package — no Angular plugin or zone setup needed, but
    // this one touches the DOM (anchor click, Blob URLs), so unlike
    // @dgkit/format it still needs a jsdom environment.
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reportsDirectory: '../../coverage/packages/blob-saver',
      reporter: ['text', 'lcov'],
      include: ['src/lib/**/*.ts'],
      exclude: [
        'src/lib/**/*.spec.ts',
        'src/lib/**/*.types.ts',
        'src/lib/testing/**',
      ],
      thresholds: { statements: 95, branches: 90, functions: 95, lines: 95 },
    },
  },
});
