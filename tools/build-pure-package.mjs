#!/usr/bin/env node
/**
 * Build a framework-free @dgkit package into a complete, publishable
 * directory at `dist/packages/<name>`.
 *
 * Usage:
 *   node tools/build-pure-package.mjs betting-math
 *
 * The Angular packages are built with ng-packagr, which emits the Angular
 * Package Format — ESM only, by design. That format is wrong for the pure
 * packages: plenty of the Node services they target still run CommonJS, and
 * an ESM-only artifact either fails outright on Node <22.12 or silently
 * resolves through `require(esm)` on newer Node and looks fine until it
 * doesn't. So pure packages are bundled with tsup instead, emitting both
 * module systems plus per-format declarations.
 *
 * Output extensions (`.mjs` / `.cjs`) are explicit rather than relying on a
 * top-level `"type"` field, so each file's module system is unambiguous no
 * matter how a consumer's bundler or Node version resolves it:
 *
 *   dist/packages/<name>/
 *     index.mjs      index.d.ts     (ESM + its types)
 *     index.cjs      index.d.cts    (CJS + its types)
 *     package.json   README.md      CHANGELOG.md
 *
 * The generated package.json is derived from the source one: workspace-only
 * fields are dropped, and the entry points, `engines` and `files` are filled
 * in here so every pure package publishes an identical shape.
 * tools/publish-dist.mjs then publishes these directories directly.
 */
import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
  readFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const name = process.argv[2];
if (!name) {
  console.error('Usage: node tools/build-pure-package.mjs <package-name>');
  process.exit(1);
}

const pkgDir = join(root, 'packages', name);
const outDir = join(root, 'dist', 'packages', name);
const manifestPath = join(pkgDir, 'package.json');

if (!existsSync(manifestPath)) {
  console.error(`No package at packages/${name}`);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

// tsup's `outExtension` is a function, so the config has to be a file rather
// than CLI flags. Written next to the package so relative paths stay simple.
const tsupConfigPath = join(pkgDir, 'tsup.config.generated.mjs');
writeFileSync(
  tsupConfigPath,
  `import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: '${pkgDir.replace(/\\/g, '/')}/src/index.ts' },
  outDir: '${outDir.replace(/\\/g, '/')}',
  format: ['esm', 'cjs'],
  target: 'es2022',
  platform: 'neutral',
  dts: true,
  sourcemap: true,
  treeshake: true,
  splitting: false,
  clean: false,
  outExtension: ({ format }) => ({ js: format === 'cjs' ? '.cjs' : '.mjs' }),
  tsconfig: '${join(pkgDir, 'tsconfig.lib.json').replace(/\\/g, '/')}',
});
`,
);

try {
  execFileSync('npx', ['tsup', '--config', tsupConfigPath], {
    cwd: root,
    stdio: 'inherit',
  });
} finally {
  rmSync(tsupConfigPath, { force: true });
}

// Anything that only matters inside the workspace is stripped from the
// published manifest; everything else is carried through untouched so the
// source package.json stays the single source of truth for metadata.
const {
  scripts: _scripts,
  devDependencies: _devDependencies,
  publishConfig,
  ...carried
} = manifest;

// No top-level `"type"`: every emitted file carries an explicit `.mjs`/`.cjs`
// extension, so its module system is decided by the extension alone and can't
// be flipped by how a consumer's tooling interprets the field. `main`/`module`/
// `types` are the legacy fallbacks for resolvers that predate `exports`; they
// point at `.d.ts` rather than `.d.mts` so `moduleResolution: "node"` setups
// still find the declarations.
const published = {
  ...carried,
  main: './index.cjs',
  module: './index.mjs',
  types: './index.d.ts',
  exports: {
    '.': {
      import: { types: './index.d.ts', default: './index.mjs' },
      require: { types: './index.d.cts', default: './index.cjs' },
    },
    './package.json': './package.json',
  },
  files: [
    'index.mjs',
    'index.cjs',
    'index.d.ts',
    'index.d.cts',
    '*.map',
    'README.md',
    'CHANGELOG.md',
  ],
  engines: { node: '>=18' },
  sideEffects: false,
  ...(publishConfig ? { publishConfig } : {}),
};

writeFileSync(
  join(outDir, 'package.json'),
  JSON.stringify(published, null, 2) + '\n',
);

for (const asset of ['README.md', 'CHANGELOG.md']) {
  const from = join(pkgDir, asset);
  if (existsSync(from)) {
    copyFileSync(from, join(outDir, asset));
  }
}

console.log(`\n✔ Built @dgkit/${name} → dist/packages/${name} (esm + cjs)\n`);
