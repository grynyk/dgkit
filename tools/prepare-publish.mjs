#!/usr/bin/env node
/**
 * Normalize built packages just before `changeset publish`.
 *
 * Each source `package.json` carries `publishConfig.directory` so that
 * `pnpm publish` (invoked by `changeset publish`) publishes the ng-packagr
 * output in `dist/packages/<name>` rather than the source. ng-packagr copies
 * `publishConfig` verbatim into the built `package.json`, which would leave a
 * now-meaningless `directory` field in the published metadata — so we strip it
 * here, keeping only `access`.
 */
import { readdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distPackages = join(root, 'dist', 'packages');

if (!existsSync(distPackages)) {
  console.error(
    `No built packages found at ${distPackages}. Run the build first.`,
  );
  process.exit(1);
}

let cleaned = 0;
for (const name of readdirSync(distPackages)) {
  const pkgPath = join(distPackages, name, 'package.json');
  if (!existsSync(pkgPath)) {
    continue;
  }
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  if (pkg.publishConfig && 'directory' in pkg.publishConfig) {
    delete pkg.publishConfig.directory;
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    cleaned += 1;
  }
}

console.log(`✔ prepared ${cleaned} package(s) for publishing`);
