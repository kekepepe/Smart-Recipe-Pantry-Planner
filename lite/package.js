import { execFileSync } from 'node:child_process';
import { chmodSync, cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
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
  const prebuilds = join(root, 'node_modules/better-sqlite3/prebuilds');
  for (const file of readdirSync(prebuilds)) {
    if (file.endsWith('.node') && file !== `${target}.node`) rmSync(join(prebuilds, file));
  }

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
