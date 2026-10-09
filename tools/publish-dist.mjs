#!/usr/bin/env node
/**
 * Publish the built packages to npm.
 *
 * ng-packagr emits a complete, publishable package into `dist/packages/<name>`
 * (its own package.json with the right exports/version). Yarn has no
 * `publishConfig.directory` equivalent, so instead of publishing the source
 * workspaces we publish each built directory directly with `npm publish`.
 *
 * Idempotent: a version already on the registry is skipped, so re-running a
 * partially-failed release only publishes what is missing.
 *
 * Auth comes from the environment the CI provides (the changesets/action step
 * writes ~/.npmrc from NPM_TOKEN). Provenance is enabled when
 * NPM_CONFIG_PROVENANCE=true and the workflow has `id-token: write`.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distPackages = join(root, 'dist', 'packages');
const sourcePackages = join(root, 'packages');

if (!existsSync(distPackages)) {
  console.error(
    `No built packages at ${distPackages}. Run "yarn build" first.`,
  );
  process.exit(1);
}

/**
 * `dist/` is never cleaned, so renaming or removing a package leaves its last
 * build behind — and this script publishes whatever directory it finds. A
 * fresh CI checkout starts empty and is unaffected, but `yarn release` run
 * locally would push a package that no longer has source. Refuse instead.
 */
const orphans = readdirSync(distPackages).filter(
  (name) =>
    existsSync(join(distPackages, name, 'package.json')) &&
    !existsSync(join(sourcePackages, name, 'package.json')),
);

if (orphans.length > 0) {
  console.error(
    `Refusing to publish: dist/packages contains ${orphans.length} directory(ies) with no ` +
      `matching source package — leftovers from a rename or removal.\n` +
      orphans.map((n) => `  dist/packages/${n}`).join('\n') +
      `\n\nDelete them (or "rm -rf dist" and rebuild) and re-run.`,
  );
  process.exit(1);
}

/** Is this exact name@version already on the registry? */
function alreadyPublished(name, version) {
  try {
    const out = execFileSync(
      'npm',
      ['view', `${name}@${version}`, 'version', '--json'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    ).trim();
    return out.length > 0;
  } catch {
    // `npm view` exits non-zero when the version does not exist yet.
    return false;
  }
}

const published = [];
const skipped = [];
let failed = 0;

for (const name of readdirSync(distPackages)) {
  const dir = join(distPackages, name);
  const manifestPath = join(dir, 'package.json');
  if (!existsSync(manifestPath)) {
    continue;
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const id = `${manifest.name}@${manifest.version}`;

  if (alreadyPublished(manifest.name, manifest.version)) {
    console.log(`↷ ${id} already published — skipping`);
    skipped.push(id);
    continue;
  }

  console.log(`→ publishing ${id}`);
  try {
    execFileSync('npm', ['publish', dir, '--access', 'public'], {
      stdio: 'inherit',
    });
    published.push(id);
  } catch {
    console.error(`✗ failed to publish ${id}`);
    failed += 1;
  }
}

console.log(
  `\nDone. published: ${published.length}, skipped: ${skipped.length}, failed: ${failed}`,
);
if (published.length) {
  for (const id of published) console.log(`  ✓ ${id}`);
}
process.exit(failed > 0 ? 1 : 0);
