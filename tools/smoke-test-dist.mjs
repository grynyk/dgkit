#!/usr/bin/env node
/**
 * Verify every built package in `dist/packages` can actually be loaded the
 * ways its own manifest promises.
 *
 * `npm pack --dry-run` (see the CI build job) checks what goes *into* the
 * tarball. It says nothing about whether the result imports, which is how an
 * ESM-only artifact shipped for months looking fine on Node 24 — where
 * `require(esm)` quietly papers over a missing `require` condition — while
 * failing outright on Node 18 and 20.
 *
 * So this packs each built package, installs the tarball into a throwaway
 * project, and loads it for real. The manifest drives what gets tested: a
 * package declaring `exports["."].require` must be requirable, one declaring
 * `import` must be importable, and when both exist their export names have to
 * match. Run it across a Node version matrix to catch the version-specific
 * resolution differences that are the whole point.
 *
 * Usage:
 *   node tools/smoke-test-dist.mjs
 */
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distPackages = join(root, 'dist', 'packages');

if (!existsSync(distPackages)) {
  console.error(
    `No built packages at ${distPackages}. Run "yarn build" first.`,
  );
  process.exit(1);
}

const run = (cmd, args, cwd) =>
  execFileSync(cmd, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

const failures = [];
let checked = 0;

for (const name of readdirSync(distPackages)) {
  const dir = join(distPackages, name);
  const manifestPath = join(dir, 'package.json');
  if (!existsSync(manifestPath)) continue;

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

  // Angular packages are skipped deliberately, not incidentally. Importing one
  // evaluates its DI metadata at module scope, so a meaningful load test needs a
  // full Angular runtime installed alongside it — and Angular's own Node floor
  // is higher than the >=18 these pure packages promise, which would make the
  // version matrix below fail for reasons that have nothing to do with us.
  // Their ESM-only Angular Package Format output is correct as it stands.
  if (manifest.peerDependencies?.['@angular/core']) {
    console.log(
      `· ${manifest.name}  skipped (Angular package — needs an Angular runtime)`,
    );
    continue;
  }

  const entry = manifest.exports?.['.'] ?? {};
  const wantsRequire = Boolean(entry.require ?? manifest.main);
  const wantsImport = Boolean(entry.import ?? manifest.module ?? entry.default);

  const sandbox = mkdtempSync(join(tmpdir(), `dgkit-smoke-${name}-`));
  try {
    // Read the tarball name off disk rather than out of npm's stdout — what
    // `npm pack` prints, and whether `--silent` suppresses it, varies by npm
    // major, and this runs across four Node versions.
    run(
      'npm',
      ['pack', dir, '--pack-destination', sandbox, '--silent'],
      sandbox,
    );
    const tgz = readdirSync(sandbox).find((f) => f.endsWith('.tgz'));
    if (!tgz) throw new Error('npm pack produced no tarball');

    writeFileSync(
      join(sandbox, 'package.json'),
      JSON.stringify(
        { name: 'smoke', version: '1.0.0', private: true },
        null,
        2,
      ),
    );
    run(
      'npm',
      ['install', join(sandbox, tgz), '--no-audit', '--no-fund', '--silent'],
      sandbox,
    );

    let cjsKeys = null;
    let esmKeys = null;

    if (wantsRequire) {
      writeFileSync(
        join(sandbox, 'probe.cjs'),
        `const m = require(${JSON.stringify(manifest.name)});\n` +
          `process.stdout.write(Object.keys(m).sort().join(","));\n`,
      );
      cjsKeys = run('node', ['probe.cjs'], sandbox).trim();
      if (!cjsKeys) throw new Error('require() resolved but exported nothing');
    }

    if (wantsImport) {
      writeFileSync(
        join(sandbox, 'probe.mjs'),
        `const m = await import(${JSON.stringify(manifest.name)});\n` +
          `process.stdout.write(Object.keys(m).filter((k) => k !== 'default').sort().join(","));\n`,
      );
      esmKeys = run('node', ['probe.mjs'], sandbox).trim();
      if (!esmKeys) throw new Error('import() resolved but exported nothing');
    }

    if (cjsKeys !== null && esmKeys !== null && cjsKeys !== esmKeys) {
      const only = (a, b) =>
        a.split(',').filter((k) => !b.split(',').includes(k));
      throw new Error(
        `CJS and ESM export different names — ` +
          `require-only: [${only(cjsKeys, esmKeys)}], import-only: [${only(esmKeys, cjsKeys)}]`,
      );
    }

    const modes = [wantsRequire && 'require', wantsImport && 'import']
      .filter(Boolean)
      .join(' + ');
    const count = (cjsKeys ?? esmKeys).split(',').length;
    console.log(`✔ ${manifest.name}  ${modes}  (${count} exports)`);
    checked += 1;
  } catch (error) {
    const detail = error.stderr?.toString().trim() || error.message;
    console.error(
      `✗ ${manifest.name}\n    ${detail.split('\n').slice(0, 6).join('\n    ')}`,
    );
    failures.push(manifest.name);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
}

console.log(
  `\n${checked} package(s) loaded cleanly on Node ${process.version}.`,
);
if (failures.length) {
  console.error(`${failures.length} failed: ${failures.join(', ')}`);
  process.exit(1);
}
