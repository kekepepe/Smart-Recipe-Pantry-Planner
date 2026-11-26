import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const LITE_RUNTIME_VERSION = 1;
export const DEFAULT_REPOSITORY = 'kekepepe/Smart-Recipe-Pantry-Planner';
export const DEFAULT_MANIFEST_URL = `https://github.com/${DEFAULT_REPOSITORY}/releases/latest/download/lite-update-manifest.json`;
export const DEFAULT_RELEASE_URL = `https://github.com/${DEFAULT_REPOSITORY}/releases/latest`;

const MAX_BUNDLE_BYTES = 50 * 1024 * 1024; // 50 MB safety cap
const REQUEST_TIMEOUT_MS = 15000;
const REQUIRED_BUNDLE_FILES = [
  'dist/index.html',
  'server/app.js',
  'server/db/initialize.js',
  'data/catalog.js',
];
const ALLOWED_GITHUB_HOSTS = new Set([
  'github.com',
  'objects.githubusercontent.com',
  'release-assets.githubusercontent.com',
  'github-releases.githubusercontent.com',
]);

export function computeDepsHash(pkg) {
  const deps = pkg?.dependencies && typeof pkg.dependencies === 'object' ? pkg.dependencies : {};
  const normalized = Object.keys(deps).sort().map(key => `${key}@${deps[key]}`).join('\n');
  const nodeEngine = String(pkg?.engines?.node || '');
  return createHash('sha256').update(`${normalized}\nnode:${nodeEngine}`).digest('hex').slice(0, 16);
}

function parseSemver(version) {
  const match = String(version || '').trim().replace(/^v/, '').match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    pre: match[4] || '',
  };
}

export function compareSemver(a, b) {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb) return String(a).localeCompare(String(b));
  for (const key of ['major', 'minor', 'patch']) {
    if (pa[key] !== pb[key]) return pa[key] - pb[key];
  }
  if (pa.pre === pb.pre) return 0;
  if (!pa.pre) return 1;
  if (!pb.pre) return -1;
  return pa.pre.localeCompare(pb.pre);
}

export function readRuntimeInfo(packageRoot) {
  const runtimePath = join(packageRoot, 'lite-runtime.json');
  if (existsSync(runtimePath)) {
    const parsed = JSON.parse(readFileSync(runtimePath, 'utf8'));
    return {
      version: String(parsed.version || '0.0.0'),
      depsHash: String(parsed.depsHash || ''),
      runtimeVersion: Number(parsed.runtimeVersion || LITE_RUNTIME_VERSION),
      repository: String(parsed.repository || DEFAULT_REPOSITORY),
    };
  }
  const pkg = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
  return {
    version: String(pkg.version || '0.0.0'),
    depsHash: computeDepsHash(pkg),
    runtimeVersion: LITE_RUNTIME_VERSION,
    repository: DEFAULT_REPOSITORY,
  };
}

function updatesRoot(packageRoot) {
  return join(packageRoot, '.updates');
}

function activePointerPath(packageRoot) {
  return join(updatesRoot(packageRoot), 'active.json');
}

function hasRequiredFiles(dir) {
  return REQUIRED_BUNDLE_FILES.every(rel => existsSync(join(dir, rel)));
}

export function resolveActiveBundle(packageRoot) {
  const runtime = readRuntimeInfo(packageRoot);
  const pointerPath = activePointerPath(packageRoot);
  if (existsSync(pointerPath)) {
    try {
      const active = JSON.parse(readFileSync(pointerPath, 'utf8'));
      const safeDir = typeof active?.dir === 'string' && /^[A-Za-z0-9._-]+$/.test(active.dir) ? active.dir : null;
      if (safeDir && typeof active?.version === 'string') {
        const candidateDir = resolve(updatesRoot(packageRoot), safeDir);
        const expectedParent = resolve(updatesRoot(packageRoot));
        if (candidateDir.startsWith(expectedParent) && hasRequiredFiles(candidateDir)) {
          return {
            version: active.version,
            builtInVersion: runtime.version,
            rootDir: candidateDir,
            isUpdated: true,
          };
        }
      }
    } catch {
      // Corrupt pointer falls back cleanly to built-in bundle.
    }
  }
  return {
    version: runtime.version,
    builtInVersion: runtime.version,
    rootDir: packageRoot,
    isUpdated: false,
  };
}

export function clearActiveBundle(packageRoot) {
  rmSync(activePointerPath(packageRoot), { force: true });
}

function isAllowedUrl(urlString, customManifestUrl) {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    return false;
  }
  if (customManifestUrl) {
    const custom = new URL(customManifestUrl);
    if (parsed.origin === custom.origin) return true;
  }
  return parsed.protocol === 'https:' && ALLOWED_GITHUB_HOSTS.has(parsed.hostname);
}

export function validateManifest(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('Update manifest must be a JSON object.');
  if (raw.schemaVersion !== 1) throw new Error(`Unsupported update manifest schemaVersion: ${raw.schemaVersion}`);
  if (typeof raw.version !== 'string' || !parseSemver(raw.version)) throw new Error('Update manifest has an invalid version.');
  if (typeof raw.depsHash !== 'string' || !/^[a-f0-9]{16}$/i.test(raw.depsHash)) throw new Error('Update manifest has an invalid depsHash.');
  if (!Number.isInteger(raw.minLiteRuntimeVersion) || raw.minLiteRuntimeVersion < 1) {
    throw new Error('Update manifest has an invalid minLiteRuntimeVersion.');
  }
  if (typeof raw.bundleFile !== 'string' || !/^[A-Za-z0-9._-]+\.tar\.gz$/.test(raw.bundleFile)) {
    throw new Error('Update manifest has an invalid bundleFile name.');
  }
  if (typeof raw.bundleSha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(raw.bundleSha256)) {
    throw new Error('Update manifest has an invalid bundleSha256.');
  }
  if (!Number.isInteger(raw.bundleSize) || raw.bundleSize <= 0 || raw.bundleSize > MAX_BUNDLE_BYTES) {
    throw new Error('Update manifest has an invalid bundleSize.');
  }
  return {
    schemaVersion: 1,
    version: raw.version,
    depsHash: raw.depsHash.toLowerCase(),
    minLiteRuntimeVersion: raw.minLiteRuntimeVersion,
    bundleFile: raw.bundleFile,
    bundleSha256: raw.bundleSha256.toLowerCase(),
    bundleSize: raw.bundleSize,
    releaseUrl: typeof raw.releaseUrl === 'string' && raw.releaseUrl.startsWith('https://')
      ? raw.releaseUrl
      : DEFAULT_RELEASE_URL,
    notes: typeof raw.notes === 'string' ? raw.notes.slice(0, 600) : '',
    publishedAt: typeof raw.publishedAt === 'string' ? raw.publishedAt : null,
  };
}

async function fetchChecked(url, { customManifestUrl, fetchImpl = fetch, maxBytes } = {}) {
  if (!isAllowedUrl(url, customManifestUrl)) {
    throw new Error(`Blocked untrusted update URL: ${url}`);
  }
  const response = await fetchImpl(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: { 'User-Agent': 'Pantry-and-Plate-Lite-Updater' },
  });
  if (response.url && !isAllowedUrl(response.url, customManifestUrl)) {
    throw new Error(`Blocked untrusted redirect URL: ${response.url}`);
  }
  if (!response.ok) {
    throw new Error(`Update server responded with HTTP ${response.status}.`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (maxBytes && buffer.length > maxBytes) {
    throw new Error(`Downloaded payload exceeds maximum size (${maxBytes} bytes).`);
  }
  return buffer;
}

export async function checkForUpdate(packageRoot, { manifestUrl, fetchImpl = fetch } = {}) {
  const runtime = readRuntimeInfo(packageRoot);
  const active = resolveActiveBundle(packageRoot);
  const effectiveUrl = manifestUrl || DEFAULT_MANIFEST_URL;
  const rawBytes = await fetchChecked(effectiveUrl, {
    customManifestUrl: manifestUrl || null,
    fetchImpl,
    maxBytes: 256 * 1024,
  });
  const manifest = validateManifest(JSON.parse(rawBytes.toString('utf8')));

  if (compareSemver(manifest.version, active.version) <= 0) {
    return {
      status: 'up-to-date',
      currentVersion: active.version,
      latestVersion: manifest.version,
      releaseUrl: manifest.releaseUrl,
    };
  }

  if (manifest.minLiteRuntimeVersion > runtime.runtimeVersion || manifest.depsHash !== runtime.depsHash) {
    return {
      status: 'full-download-required',
      currentVersion: active.version,
      latestVersion: manifest.version,
      releaseUrl: manifest.releaseUrl,
      notes: manifest.notes,
      reason: manifest.minLiteRuntimeVersion > runtime.runtimeVersion
        ? 'Lite runtime was updated.'
        : 'Production dependencies changed.',
    };
  }

  return {
    status: 'update-available',
    currentVersion: active.version,
    latestVersion: manifest.version,
    bundleFile: manifest.bundleFile,
    bundleSha256: manifest.bundleSha256,
    bundleSize: manifest.bundleSize,
    releaseUrl: manifest.releaseUrl,
    notes: manifest.notes,
    manifest,
  };
}

function assertSafeTarEntries(archivePath) {
  const listing = execFileSync('tar', ['-tzf', archivePath], { encoding: 'utf8' });
  const entries = listing.split(/\r?\n/).filter(Boolean);
  if (entries.length === 0) throw new Error('Update archive is empty.');
  for (const entry of entries) {
    const normalized = entry.replace(/\\/g, '/');
    if (
      normalized.startsWith('/')
      || /^[A-Za-z]:/.test(normalized)
      || normalized.split('/').includes('..')
    ) {
      throw new Error(`Unsafe path in update archive: ${entry}`);
    }
  }
}

function cleanupOldVersions(baseDir, keepDirs) {
  const keep = new Set(keepDirs);
  for (const entry of readdirSync(baseDir)) {
    if (entry === 'active.json' || keep.has(entry)) continue;
    rmSync(join(baseDir, entry), { recursive: true, force: true });
  }
}

export async function applyUpdate(packageRoot, { manifestUrl, fetchImpl = fetch } = {}) {
  const check = await checkForUpdate(packageRoot, { manifestUrl, fetchImpl });
  if (check.status !== 'update-available') {
    return check;
  }

  const { manifest } = check;
  const effectiveManifestUrl = manifestUrl || DEFAULT_MANIFEST_URL;
  const bundleUrl = new URL(manifest.bundleFile, effectiveManifestUrl).href;
  const archiveBuffer = await fetchChecked(bundleUrl, {
    customManifestUrl: manifestUrl || null,
    fetchImpl,
    maxBytes: MAX_BUNDLE_BYTES,
  });

  if (archiveBuffer.length !== manifest.bundleSize) {
    throw new Error(`Update size mismatch: expected ${manifest.bundleSize} bytes, got ${archiveBuffer.length}.`);
  }
  const actualHash = createHash('sha256').update(archiveBuffer).digest('hex');
  if (actualHash !== manifest.bundleSha256) {
    throw new Error('Update integrity check failed (SHA-256 mismatch).');
  }

  const baseDir = updatesRoot(packageRoot);
  mkdirSync(baseDir, { recursive: true });
  const staging = mkdtempSync(join(baseDir, '.staging-'));
  try {
    const archivePath = join(staging, 'bundle.tar.gz');
    const extractDir = join(staging, 'extracted');
    mkdirSync(extractDir);
    writeFileSync(archivePath, archiveBuffer);
    assertSafeTarEntries(archivePath);
    execFileSync('tar', ['-xzf', archivePath, '-C', extractDir]);
    if (!hasRequiredFiles(extractDir)) {
      throw new Error('Update bundle is missing required application files.');
    }

    const versionDirName = manifest.version.replace(/[^A-Za-z0-9._-]/g, '_');
    const targetDir = join(baseDir, versionDirName);
    rmSync(targetDir, { recursive: true, force: true });
    renameSync(extractDir, targetDir);

    const pointerTemp = join(baseDir, `.active-${Date.now()}.tmp`);
    writeFileSync(pointerTemp, JSON.stringify({
      version: manifest.version,
      dir: versionDirName,
      sha256: actualHash,
      appliedAt: new Date().toISOString(),
    }, null, 2));
    renameSync(pointerTemp, activePointerPath(packageRoot));

    cleanupOldVersions(baseDir, [versionDirName]);
    return {
      status: 'applied',
      version: manifest.version,
      previousVersion: check.currentVersion,
      sha256: actualHash,
    };
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}
