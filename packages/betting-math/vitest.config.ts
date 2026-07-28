/// <reference types="vitest" />
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root,
  test: {
    // Framework-free package — pure math, no Angular, no DOM.
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reportsDirectory: '../../coverage/packages/betting-math',
      reporter: ['text', 'lcov'],
      include: ['src/lib/**/*.ts'],
      exclude: ['src/lib/**/*.spec.ts', 'src/lib/**/*.types.ts'],
      thresholds: { statements: 95, branches: 90, functions: 95, lines: 95 },
    },
  },
});
