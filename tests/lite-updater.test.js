import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  applyUpdate,
  checkForUpdate,
  clearActiveBundle,
  compareSemver,
  computeDepsHash,
  LITE_RUNTIME_VERSION,
  resolveActiveBundle,
  validateManifest,
} from '../lite/updater.js';

function createFixtureLiteRoot(baseDir, version = '1.0.1', depsHash = '0123456789abcdef') {
  const root = join(baseDir, 'lite-app');
  mkdirSync(join(root, 'dist'), { recursive: true });
  mkdirSync(join(root, 'server/db'), { recursive: true });
  mkdirSync(join(root, 'data'), { recursive: true });
  writeFileSync(join(root, 'dist/index.html'), '<html><body>built-in</body></html>');
  writeFileSync(join(root, 'server/app.js'), 'export function createApp() {}');
  writeFileSync(join(root, 'server/db/initialize.js'), 'export async function initializeDatabase() {}');
  writeFileSync(join(root, 'data/catalog.js'), 'export const catalog = [];');
  writeFileSync(join(root, 'lite-runtime.json'), JSON.stringify({
    version,
    depsHash,
    runtimeVersion: LITE_RUNTIME_VERSION,
  }));
  return root;
}

function createTarGz(baseDir, files, archiveName = 'bundle.tar.gz') {
  const src = join(baseDir, `src-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  mkdirSync(src, { recursive: true });
  for (const [rel, content] of Object.entries(files)) {
    const dest = join(src, rel);
    mkdirSync(join(dest, '..'), { recursive: true });
    writeFileSync(dest, content);
  }
  const archivePath = join(baseDir, archiveName);
  execFileSync('tar', ['-czf', archivePath, '-C', src, '.']);
  const bytes = readFileSync(archivePath);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  return { archivePath, bytes, sha256 };
}

test('compareSemver and computeDepsHash behave deterministically', () => {
  assert.ok(compareSemver('1.0.2', '1.0.1') > 0);
  assert.ok(compareSemver('1.1.0', '1.0.9') > 0);
  assert.ok(compareSemver('2.0.0', '1.9.9') > 0);
  assert.equal(compareSemver('v1.0.1', '1.0.1'), 0);
  assert.ok(compareSemver('1.0.1-beta.1', '1.0.1') < 0);

  const hashA = computeDepsHash({ dependencies: { express: '^5.3.0', 'better-sqlite3': '13.2.0' }, engines: { node: '>=22' } });
  const hashB = computeDepsHash({ dependencies: { 'better-sqlite3': '13.2.0', express: '^5.3.0' }, engines: { node: '>=22' } });
  const hashC = computeDepsHash({ dependencies: { 'better-sqlite3': '14.0.0', express: '^5.3.0' }, engines: { node: '>=22' } });
  assert.equal(hashA, hashB);
  assert.notEqual(hashA, hashC);
  assert.match(hashA, /^[a-f0-9]{16}$/);
});

test('validateManifest rejects malformed manifests and untrusted URLs are blocked', async () => {
  assert.throws(() => validateManifest(null), /JSON object/);
  assert.throws(() => validateManifest({ schemaVersion: 2 }), /schemaVersion/);
  assert.throws(() => validateManifest({
    schemaVersion: 1,
    version: '1.0.2',
    depsHash: '0123456789abcdef',
    minLiteRuntimeVersion: 1,
    bundleFile: '../evil.tar.gz',
    bundleSha256: 'a'.repeat(64),
    bundleSize: 100,
  }), /bundleFile/);

  const scratch = mkdtempSync(join(tmpdir(), 'lite-updater-url-'));
  try {
    const root = createFixtureLiteRoot(scratch);
    await assert.rejects(
      () => checkForUpdate(root, {
        manifestUrl: 'https://github.com/kekepepe/Smart-Recipe-Pantry-Planner/releases/latest/download/lite-update-manifest.json',
        fetchImpl: async () => ({ ok: true, url: 'https://evil.example.com/manifest.json', arrayBuffer: async () => new ArrayBuffer(0) }),
      }),
      /Blocked untrusted redirect URL/,
    );
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test('checkForUpdate detects up-to-date, update-available, and full-download-required', async () => {
  const scratch = mkdtempSync(join(tmpdir(), 'lite-updater-check-'));
  try {
    const depsHash = '0123456789abcdef';
    const root = createFixtureLiteRoot(scratch, '1.0.1', depsHash);
    const makeFetch = manifest => async () => ({
      ok: true,
      url: 'http://127.0.0.1:9999/lite-update-manifest.json',
      arrayBuffer: async () => Buffer.from(JSON.stringify(manifest)),
    });
    const baseManifest = {
      schemaVersion: 1,
      version: '1.0.1',
      depsHash,
      minLiteRuntimeVersion: LITE_RUNTIME_VERSION,
      bundleFile: 'Pantry-and-Plate-1.0.1-Lite-Bundle.tar.gz',
      bundleSha256: 'a'.repeat(64),
      bundleSize: 1024,
    };

    const same = await checkForUpdate(root, { manifestUrl: 'http://127.0.0.1:9999/lite-update-manifest.json', fetchImpl: makeFetch(baseManifest) });
    assert.equal(same.status, 'up-to-date');

    const newer = await checkForUpdate(root, {
      manifestUrl: 'http://127.0.0.1:9999/lite-update-manifest.json',
      fetchImpl: makeFetch({ ...baseManifest, version: '1.0.2', bundleFile: 'Pantry-and-Plate-1.0.2-Lite-Bundle.tar.gz' }),
    });
    assert.equal(newer.status, 'update-available');
    assert.equal(newer.latestVersion, '1.0.2');

    const depsChanged = await checkForUpdate(root, {
      manifestUrl: 'http://127.0.0.1:9999/lite-update-manifest.json',
      fetchImpl: makeFetch({ ...baseManifest, version: '1.1.0', depsHash: 'fedcba9876543210' }),
    });
    assert.equal(depsChanged.status, 'full-download-required');

    const runtimeChanged = await checkForUpdate(root, {
      manifestUrl: 'http://127.0.0.1:9999/lite-update-manifest.json',
      fetchImpl: makeFetch({ ...baseManifest, version: '1.1.0', minLiteRuntimeVersion: LITE_RUNTIME_VERSION + 1 }),
    });
    assert.equal(runtimeChanged.status, 'full-download-required');
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test('applyUpdate verifies SHA-256, activates bundle atomically, and supports rollback', async () => {
  const scratch = mkdtempSync(join(tmpdir(), 'lite-updater-apply-'));
  try {
    const depsHash = '0123456789abcdef';
    const root = createFixtureLiteRoot(scratch, '1.0.1', depsHash);
    const { bytes, sha256 } = createTarGz(scratch, {
      'dist/index.html': '<html><body>updated-1.0.2</body></html>',
      'server/app.js': 'export function createApp() { return "1.0.2"; }',
      'server/db/initialize.js': 'export async function initializeDatabase() {}',
      'data/catalog.js': 'export const catalog = ["updated"];',
    }, 'Pantry-and-Plate-1.0.2-Lite-Bundle.tar.gz');

    const manifest = {
      schemaVersion: 1,
      version: '1.0.2',
      depsHash,
      minLiteRuntimeVersion: LITE_RUNTIME_VERSION,
      bundleFile: 'Pantry-and-Plate-1.0.2-Lite-Bundle.tar.gz',
      bundleSha256: sha256,
      bundleSize: bytes.length,
    };

    // First test SHA-256 mismatch rejection
    await assert.rejects(
      () => applyUpdate(root, {
        manifestUrl: 'http://127.0.0.1:9999/lite-update-manifest.json',
        fetchImpl: async url => ({
          ok: true,
          url,
          arrayBuffer: async () => (url.endsWith('.json')
            ? Buffer.from(JSON.stringify({ ...manifest, bundleSha256: 'b'.repeat(64) }))
            : bytes),
        }),
      }),
      /SHA-256 mismatch/,
    );
    assert.equal(resolveActiveBundle(root).isUpdated, false);

    // Valid apply
    const applied = await applyUpdate(root, {
      manifestUrl: 'http://127.0.0.1:9999/lite-update-manifest.json',
      fetchImpl: async url => ({
        ok: true,
        url,
        arrayBuffer: async () => (url.endsWith('.json') ? Buffer.from(JSON.stringify(manifest)) : bytes),
      }),
    });
    assert.equal(applied.status, 'applied');
    assert.equal(applied.version, '1.0.2');

    const active = resolveActiveBundle(root);
    assert.equal(active.isUpdated, true);
    assert.equal(active.version, '1.0.2');
    assert.ok(existsSync(join(active.rootDir, 'dist/index.html')));
    assert.match(readFileSync(join(active.rootDir, 'dist/index.html'), 'utf8'), /updated-1\.0\.2/);

    // Rollback clears active pointer and falls back to built-in
    clearActiveBundle(root);
    const rolledBack = resolveActiveBundle(root);
    assert.equal(rolledBack.isUpdated, false);
    assert.equal(rolledBack.version, '1.0.1');
    assert.equal(rolledBack.rootDir, root);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});
