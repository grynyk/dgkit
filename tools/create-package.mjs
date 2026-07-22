#!/usr/bin/env node
/**
 * Scaffold a new publishable @dgkit package under `packages/<name>/`.
 *
 * Usage:
 *   pnpm new:package <kebab-name> "<one-line description>"
 *   node tools/create-package.mjs media-query "Angular media-query directive."
 *
 * Generates a package that mirrors @dgkit/resize-observer's structure: its own
 * package.json / project.json / ng-package.json, tsconfigs, Jest + Vitest
 * configs, test setups, a stub source + spec, README and CHANGELOG — all wired
 * into the Nx + pnpm workspace and ready for `nx build|test|test-vitest|lint`.
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const [, , rawName, ...descParts] = process.argv;
if (!rawName) {
  console.error('Usage: pnpm new:package <kebab-name> "<description>"');
  process.exit(1);
}

const name = rawName.trim().toLowerCase();
if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name)) {
  console.error(
    `Invalid package name "${rawName}". Use kebab-case, e.g. media-query.`,
  );
  process.exit(1);
}

const description = descParts.join(' ').trim() || `Angular ${name} utilities.`;
const pascal = name
  .split('-')
  .map((p) => p[0].toUpperCase() + p.slice(1))
  .join('');
const pkgDir = join(root, 'packages', name);

if (existsSync(pkgDir)) {
  console.error(`Package already exists: packages/${name}`);
  process.exit(1);
}

// Reuse the exact Angular/RxJS peer ranges from the reference package so every
// package stays consistent.
const reference = JSON.parse(
  readFileSync(join(root, 'packages/resize-observer/package.json'), 'utf8'),
);

const file = (rel, content) => {
  const target = join(pkgDir, rel);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content.endsWith('\n') ? content : content + '\n');
};

const json = (obj) => JSON.stringify(obj, null, 2);

file(
  'package.json',
  json({
    name: `@dgkit/${name}`,
    version: '0.0.0',
    description,
    author: { name: 'Daniel Grynyk', email: 'danielgrynyk@gmail.com' },
    license: 'MIT',
    homepage: `https://github.com/grynyk/dgkit/tree/main/packages/${name}#readme`,
    bugs: { url: 'https://github.com/grynyk/dgkit/issues' },
    repository: {
      type: 'git',
      url: 'git+https://github.com/grynyk/dgkit.git',
      directory: `packages/${name}`,
    },
    keywords: ['angular', 'standalone', 'ssr', name, 'dgkit'],
    sideEffects: false,
    publishConfig: { access: 'public' },
    peerDependencies: reference.peerDependencies,
    dependencies: { tslib: '^2.3.0' },
  }),
);

file(
  'project.json',
  json({
    $schema: '../../node_modules/nx/schemas/project-schema.json',
    name,
    projectType: 'library',
    sourceRoot: `packages/${name}/src`,
    tags: ['scope:public', 'type:lib'],
    targets: {
      build: {
        executor: 'nx:run-commands',
        outputs: [`{workspaceRoot}/dist/packages/${name}`],
        options: {
          command: `ng-packagr -p packages/${name}/ng-package.json -c packages/${name}/tsconfig.lib.json`,
        },
      },
      test: {
        executor: 'nx:run-commands',
        outputs: [`{workspaceRoot}/coverage/packages/${name}/jest`],
        options: {
          command: `jest --config packages/${name}/jest.config.ts --coverage`,
        },
      },
      'test-vitest': {
        executor: 'nx:run-commands',
        outputs: [`{workspaceRoot}/coverage/packages/${name}/vitest`],
        options: {
          command: `vitest run --config packages/${name}/vitest.config.ts --coverage`,
        },
      },
      lint: {
        executor: 'nx:run-commands',
        options: { command: `eslint packages/${name}/src --max-warnings 0` },
      },
      typecheck: {
        executor: 'nx:run-commands',
        options: {
          parallel: false,
          commands: [
            `tsc -p packages/${name}/tsconfig.lib.json --noEmit`,
            `tsc -p packages/${name}/tsconfig.spec.json --noEmit`,
          ],
        },
      },
    },
  }),
);

file(
  'ng-package.json',
  json({
    $schema: '../../node_modules/ng-packagr/ng-package.schema.json',
    dest: `../../dist/packages/${name}`,
    assets: ['./README.md', './CHANGELOG.md'],
    lib: { entryFile: 'src/index.ts' },
  }),
);

file(
  'tsconfig.json',
  json({
    extends: '../../tsconfig.base.json',
    compilerOptions: { target: 'ES2022' },
    files: [],
    include: [],
    references: [
      { path: './tsconfig.lib.json' },
      { path: './tsconfig.spec.json' },
    ],
  }),
);

file(
  'tsconfig.lib.json',
  json({
    extends: '../../tsconfig.base.json',
    compilerOptions: {
      outDir: `../../dist/out-tsc/packages/${name}`,
      declaration: true,
      declarationMap: true,
      inlineSources: true,
      types: [],
    },
    angularCompilerOptions: { compilationMode: 'partial' },
    include: ['src/**/*.ts'],
    exclude: [
      'src/**/*.spec.ts',
      'src/**/*.shared-spec.ts',
      'src/**/testing/**',
      'src/test-setup.ts',
      'src/test-setup.vitest.ts',
      'jest.config.ts',
      'vitest.config.ts',
    ],
  }),
);

file(
  'tsconfig.spec.json',
  json({
    extends: '../../tsconfig.base.json',
    compilerOptions: {
      outDir: `../../dist/out-tsc/packages/${name}-spec`,
      module: 'ESNext',
      moduleResolution: 'bundler',
      types: ['jest', 'node'],
      esModuleInterop: true,
      noUnusedLocals: false,
      noUnusedParameters: false,
      noPropertyAccessFromIndexSignature: false,
    },
    include: [
      'src/**/*.spec.ts',
      'src/**/*.shared-spec.ts',
      'src/**/testing/**/*.ts',
      'src/test-setup.ts',
      'src/test-setup.vitest.ts',
      'jest.config.ts',
      'vitest.config.ts',
    ],
  }),
);

file(
  'jest.config.ts',
  `import type { Config } from 'jest';

const config: Config = {
  displayName: '${name}',
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  testPathIgnorePatterns: ['/node_modules/', '\\\\.vitest\\\\.spec\\\\.ts$'],
  transform: {
    '^.+\\\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\\\.(html|svg)$',
        isolatedModules: true,
      },
    ],
  },
  moduleFileExtensions: ['ts', 'html', 'js', 'json', 'mjs'],
  transformIgnorePatterns: ['node_modules/(?!(.*\\\\.mjs$|rxjs|@angular))'],
  coverageDirectory: '<rootDir>/../../coverage/packages/${name}/jest',
  collectCoverageFrom: [
    'src/lib/**/*.ts',
    '!src/lib/**/*.spec.ts',
    '!src/lib/**/*.shared-spec.ts',
    '!src/lib/**/*.types.ts',
    '!src/lib/testing/**',
  ],
  coverageThreshold: {
    global: { statements: 95, branches: 90, functions: 95, lines: 95 },
  },
};

export default config;
`,
);

file(
  'vitest.config.ts',
  `/// <reference types="vitest" />
import { fileURLToPath } from 'node:url';
import angular from '@analogjs/vite-plugin-angular';
import { defineConfig } from 'vitest/config';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root,
  plugins: [
    angular({
      tsconfig: fileURLToPath(new URL('./tsconfig.spec.json', import.meta.url)),
    }),
  ],
  test: {
    // Analog's zone setup patches the global lifecycle hooks, so globals must
    // be enabled.
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.vitest.ts'],
    include: ['src/**/*.vitest.spec.ts'],
    coverage: {
      provider: 'v8',
      reportsDirectory: '../../coverage/packages/${name}/vitest',
      reporter: ['text', 'lcov'],
      include: ['src/lib/**/*.ts'],
      exclude: [
        'src/lib/**/*.spec.ts',
        'src/lib/**/*.shared-spec.ts',
        'src/lib/**/*.types.ts',
        'src/lib/testing/**',
      ],
      thresholds: { statements: 95, branches: 90, functions: 95, lines: 95 },
    },
  },
});
`,
);

file(
  'src/test-setup.ts',
  `import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

setupZoneTestEnv();
`,
);

file(
  'src/test-setup.vitest.ts',
  `import '@analogjs/vitest-angular/setup-zone';

import { NgModule, provideZoneChangeDetection } from '@angular/core';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';

@NgModule({ providers: [provideZoneChangeDetection()] })
class ZoneChangeDetectionModule {}

getTestBed().initTestEnvironment(
  [BrowserTestingModule, ZoneChangeDetectionModule],
  platformBrowserTesting(),
);
`,
);

file(
  'src/index.ts',
  `export { ${pascal}Directive } from './lib/${name}.directive';
`,
);

file(
  `src/lib/${name}.directive.ts`,
  `import { Directive } from '@angular/core';

/**
 * TODO: implement @dgkit/${name}.
 */
@Directive({
  selector: '[dg${pascal}]',
  standalone: true,
})
export class ${pascal}Directive {}
`,
);

file(
  `src/lib/${name}.directive.spec.ts`,
  `import { ${pascal}Directive } from './${name}.directive';

describe('${pascal}Directive', () => {
  it('can be constructed', () => {
    expect(new ${pascal}Directive()).toBeTruthy();
  });
});
`,
);

file(
  `src/lib/${name}.directive.vitest.spec.ts`,
  `import { describe, expect, it } from 'vitest';

import { ${pascal}Directive } from './${name}.directive';

describe('${pascal}Directive (vitest)', () => {
  it('can be constructed', () => {
    expect(new ${pascal}Directive()).toBeTruthy();
  });
});
`,
);

file(
  'README.md',
  `# @dgkit/${name}

${description}

## Installation

\`\`\`bash
pnpm add @dgkit/${name}
\`\`\`

## License

[MIT](../../LICENSE) © Daniel Grynyk
`,
);

file(
  'CHANGELOG.md',
  `# @dgkit/${name}

Managed by [Changesets](https://github.com/changesets/changesets).
`,
);

console.log(`\n✔ Created packages/${name} (@dgkit/${name})\n`);
console.log('Next steps:');
console.log('  1. pnpm install');
console.log(`  2. implement src/lib/${name}.directive.ts`);
console.log(`  3. pnpm nx test ${name} && pnpm nx build ${name}`);
console.log('  4. pnpm changeset  # describe the new package\n');
