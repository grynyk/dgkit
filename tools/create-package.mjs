#!/usr/bin/env node
/**
 * Scaffold a new publishable @dgkit package under `packages/<name>/`.
 *
 * Usage:
 *   yarn new:package <kebab-name> "<one-line description>" [--pure]
 *   node tools/create-package.mjs media-query "Angular media-query utilities."
 *
 * Generates a package mirroring @dgkit/resize-observer's structure: its own
 * package.json / project.json / ng-package.json, tsconfigs, Vitest config and
 * setup, a stub source + spec, README and CHANGELOG — wired into the Nx + Yarn
 * workspace and ready for `nx build|test|lint|typecheck`.
 *
 * `--pure` omits the Angular peer dependencies (for framework-free packages
 * such as @dgkit/format).
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const argv = process.argv.slice(2);
const pure = argv.includes('--pure');
const [rawName, ...descParts] = argv.filter((a) => !a.startsWith('--'));

if (!rawName) {
  console.error(
    'Usage: yarn new:package <kebab-name> "<description>" [--pure]',
  );
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
const camel = pascal[0].toLowerCase() + pascal.slice(1);
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
    author: { name: 'Danylo Grynyk', email: 'danielgrynyk@gmail.com' },
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
    // The publishable artifact is the ng-packagr output in dist/packages/<name>;
    // tools/publish-dist.mjs publishes those built directories directly.
    publishConfig: { access: 'public' },
    ...(pure ? {} : { peerDependencies: reference.peerDependencies }),
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
        outputs: [`{workspaceRoot}/coverage/packages/${name}`],
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
      'src/**/testing/**',
      'src/test-setup.ts',
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
      types: ['node', 'vitest/globals'],
      esModuleInterop: true,
      noUnusedLocals: false,
      noUnusedParameters: false,
      noPropertyAccessFromIndexSignature: false,
    },
    include: [
      'src/**/*.spec.ts',
      'src/**/testing/**/*.ts',
      'src/test-setup.ts',
      'vitest.config.ts',
    ],
  }),
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
    // be enabled. Specs still import their primitives from 'vitest' explicitly.
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reportsDirectory: '../../coverage/packages/${name}',
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
`,
);

file(
  'src/test-setup.ts',
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

file('src/index.ts', `export { ${camel} } from './lib/${name}';\n`);

file(
  `src/lib/${name}.ts`,
  `/**
 * TODO: implement @dgkit/${name}.
 */
export function ${camel}(): string {
  return '${name}';
}
`,
);

file(
  `src/lib/${name}.spec.ts`,
  `import { describe, expect, it } from 'vitest';

import { ${camel} } from './${name}';

describe('${camel}', () => {
  it('is defined', () => {
    expect(${camel}()).toBe('${name}');
  });
});
`,
);

const compatibility = pure
  ? `## Compatibility

> **Framework-agnostic.** \`@dgkit/${name}\` has **no Angular — or any framework — dependency**. It is pure TypeScript with zero runtime dependencies, so it works with **any Angular version** (or React, Vue, plain Node… anywhere JavaScript runs).
`
  : `## Compatibility

Works with **Angular 18, 19, 20 and 21**.

| Peer dependency   | Supported range      |
| ----------------- | -------------------- |
| \`@angular/core\`   | \`>=18.0.0 <22.0.0\`   |
| \`@angular/common\` | \`>=18.0.0 <22.0.0\`   |
| \`rxjs\`            | \`^6.5.3\` or \`^7.4.0\` |

Angular and RxJS are **peer dependencies** — never bundled into the package.
`;

file(
  'README.md',
  `# @dgkit/${name}

${description}

## Installation

\`\`\`bash
npm install @dgkit/${name}
\`\`\`

${compatibility}
## License

[MIT](../../LICENSE)
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
console.log('  1. yarn install');
console.log(`  2. implement src/lib/${name}.ts`);
console.log(`  3. yarn nx test ${name} && yarn nx build ${name}`);
console.log('  4. yarn changeset  # describe the new package\n');
