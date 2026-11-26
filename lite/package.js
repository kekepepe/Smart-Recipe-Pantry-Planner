import { execFileSync } from 'node:child_process';
import { chmodSync, cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const target = `${process.platform}-${process.arch}`;
const platforms = { 'darwin-arm64': 'mac-arm64', 'win32-x64': 'win-x64' };
if (!platforms[target]) throw new Error(`Run packaging on one of the supported native platforms, not ${target}.`);

const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const name = `Pantry-and-Plate-${version}-Lite-${platforms[target]}`;
const output = resolve('lite-dist', `${name}.zip`);
const staging = mkdtempSync(join(tmpdir(), 'pantry-lite-'));
try {
  const root = join(staging, name);
  mkdirSync(root);
  for (const file of ['package.json', 'package-lock.json']) cpSync(file, join(root, file));
  execFileSync(process.execPath, [process.env.npm_execpath, 'ci', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'], {
    cwd: root, stdio: 'inherit',
  });
  const sqlite = join(root, 'node_modules/better-sqlite3');
  const buildConfig = join(sqlite, 'binding.gyp');
  const originalConfig = readFileSync(buildConfig, 'utf8');
  // The upstream prebuild uses Node-API 10, which is unavailable in Node.js 22.12.
  if (!originalConfig.includes("'NAPI_VERSION=10'")) throw new Error('Review the SQLite build configuration for this dependency version.');
  writeFileSync(buildConfig, originalConfig.replace("'NAPI_VERSION=10'", "'NAPI_VERSION=9'"));
  const require = createRequire(import.meta.url);
  const nodeGyp = require.resolve('node-gyp/bin/node-gyp.js');
  execFileSync(process.execPath, [nodeGyp, 'rebuild', '--force_build=1'], { cwd: sqlite, stdio: 'inherit' });
  writeFileSync(buildConfig, originalConfig);

  const prebuilds = join(sqlite, 'prebuilds');
  for (const file of readdirSync(prebuilds)) {
    if (file.endsWith('.node') && file !== `${target}.node`) rmSync(join(prebuilds, file));
  }

  cpSync(join(sqlite, 'build/Release/better_sqlite3.node'), join(prebuilds, `${target}.node`));
  rmSync(join(sqlite, 'build'), { recursive: true, force: true });

  const sources = ['dist', 'server', 'src', 'web/data/fixtures.js', 'data/catalog.js', 'data/world-recipes.json', 'data/nutrition-mappings.json', 'lite/start.js'];
  for (const file of sources) {
    const destination = join(root, file);
    mkdirSync(resolve(destination, '..'), { recursive: true });
    cpSync(file, destination, { recursive: true });
  }
  const launcher = process.platform === 'darwin' ? 'Start Lite.command' : 'Start Lite.cmd';
  cpSync(join('lite', launcher), join(root, launcher));
  if (process.platform === 'darwin') chmodSync(join(root, launcher), 0o755);
  cpSync('lite/README.md', join(root, 'README.md'));
  cpSync('LICENSE', join(root, 'LICENSE'));
  mkdirSync('lite-dist', { recursive: true });
  execFileSync('tar', ['-a', '-cf', output, '-C', staging, name], { stdio: 'inherit' });
  console.log(output);
} finally {
  rmSync(staging, { recursive: true, force: true });
}
