import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeDepsHash, DEFAULT_RELEASE_URL, LITE_RUNTIME_VERSION } from './updater.js';

export const BUNDLE_SOURCES = [
  'dist',
  'server',
  'src',
  'web/data/fixtures.js',
  'data/catalog.js',
  'data/world-recipes.json',
  'data/nutrition-mappings.json',
];

export function createLiteBundle({
  sourceRoot = process.cwd(),
  outputDir = resolve(sourceRoot, 'lite-dist'),
  version,
  notes = '',
  releaseUrl = DEFAULT_RELEASE_URL,
} = {}) {
  const pkg = JSON.parse(readFileSync(join(sourceRoot, 'package.json'), 'utf8'));
  const bundleVersion = version || process.env.PANTRY_LITE_BUNDLE_VERSION || pkg.version;
  const depsHash = computeDepsHash(pkg);
  const bundleFile = `Pantry-and-Plate-${bundleVersion}-Lite-Bundle.tar.gz`;
  const bundlePath = join(outputDir, bundleFile);
  const manifestPath = join(outputDir, 'lite-update-manifest.json');

  const staging = mkdtempSync(join(tmpdir(), 'pantry-lite-bundle-'));
  try {
    for (const rel of BUNDLE_SOURCES) {
      const from = join(sourceRoot, rel);
      const to = join(staging, rel);
      mkdirSync(resolve(to, '..'), { recursive: true });
      cpSync(from, to, { recursive: true });
    }
    writeFileSync(join(staging, 'bundle-meta.json'), JSON.stringify({
      version: bundleVersion,
      depsHash,
      runtimeVersion: LITE_RUNTIME_VERSION,
      builtAt: new Date().toISOString(),
    }, null, 2));

    mkdirSync(outputDir, { recursive: true });
    execFileSync('tar', ['-czf', bundlePath, '-C', staging, '.']);

    const bytes = readFileSync(bundlePath);
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const manifest = {
      schemaVersion: 1,
      version: bundleVersion,
      depsHash,
      minLiteRuntimeVersion: LITE_RUNTIME_VERSION,
      bundleFile,
      bundleSha256: sha256,
      bundleSize: statSync(bundlePath).size,
      releaseUrl,
      notes,
      publishedAt: new Date().toISOString(),
    };
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    return { bundlePath, manifestPath, manifest };
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { bundlePath, manifestPath } = createLiteBundle();
  console.log(bundlePath);
  console.log(manifestPath);
}
