import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { initializeDatabase } from '../server/db/initialize.js';
import { Store } from '../server/services/store.js';

const target = { darwin: 'mac-arm64', win32: 'win-x64' }[process.platform];
const zip = resolve('lite-dist', readdirSync('lite-dist').find(name => name.endsWith(`-Lite-${target}.zip`)));
const scratch = mkdtempSync(join(tmpdir(), 'pantry lite smoke '));
const dataDir = join(scratch, 'user data');
const backupPath = join(scratch, 'v1.0.1 backup.sqlite');
const name = zip.split(/[\\/]/).at(-1).slice(0, -4);
const packageRoot = join(scratch, name);
let service;
const env = { ...process.env, PANTRY_LITE_DATA_DIR: dataDir };
const node = process.execPath;
const start = args => execFileSync(node, ['lite/start.js', ...args], { cwd: packageRoot, env, encoding: 'utf8' });
let origin;

async function request(path, method = 'GET', body) {
  const result = await fetch(origin + path, {
    method, signal: AbortSignal.timeout(2000),
    ...(body === undefined ? {} : { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }),
  });
  assert.equal(result.status, 200, path);
  return result.json();
}

async function launch() {
  let output = '';
  service = spawn(node, ['lite/start.js', '--no-browser'], { cwd: packageRoot, env, stdio: ['ignore', 'pipe', 'pipe'] });
  for (const stream of [service.stdout, service.stderr]) stream.on('data', chunk => { output += chunk; });
  for (let count = 0; count < 100 && service.exitCode === null; count++) {
    const ready = await fetch(origin + '/api/lite-status', { signal: AbortSignal.timeout(1000) })
      .then(response => response.ok).catch(() => false);
    if (ready) return;
    await delay(100);
  }
  throw new Error(`Lite did not start: ${output}`);
}

async function stop() {
  if (!service) return;
  const child = service;
  service = null;
  if (child.exitCode !== null || child.signalCode !== null) return;
  const closed = once(child, 'exit');
  child.kill();
  await closed;
}

const digest = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const data = snapshot => ({
  pantry: snapshot.pantry, recipes: snapshot.shoppingRecipeIds,
  shortages: snapshot.shopping.shortages, purchased: snapshot.purchasedMarks,
});
try {
  execFileSync('tar', ['-xf', zip, '-C', scratch]);
  assert(existsSync(join(packageRoot, 'LICENSE')));
  assert(existsSync(join(packageRoot, process.platform === 'darwin' ? 'Start Lite.command' : 'Start Lite.cmd')));
  const modules = join(packageRoot, 'node_modules');
  for (const excluded of ['electron', 'electron-builder', 'vite', 'playwright']) {
    assert(!existsSync(join(modules, excluded)), `Unexpected runtime package: ${excluded}`);
  }
  assert.deepEqual(readdirSync(join(modules, 'better-sqlite3', 'prebuilds')).filter(name => name.endsWith('.node')),
    [`${process.platform}-${process.arch}.node`]);

  const occupied = createServer();
  await new Promise(resolve => occupied.listen(0, '127.0.0.1', resolve));
  env.PANTRY_LITE_PORT = String(occupied.address().port);
  origin = `http://127.0.0.1:${env.PANTRY_LITE_PORT}`;
  try {
    assert.throws(() => start(['--no-browser']), /Port \d+ is in use/);
  } finally {
    await new Promise(resolve => occupied.close(resolve));
  }

  await launch();
  assert.match(start(['--no-browser']), /already running/);
  assert.match(await (await fetch(origin)).text(), /<title>/);
  const before = await request('/api/snapshot');
  assert.equal(before.recipes.length, 100);
  assert((await fetch(origin + before.recipes[0].image)).ok);
  const seeded = await request('/api/onboarding', 'POST', { mode: 'sample', expectedRevision: before.revision });
  await request('/api/pantry/egg', 'PUT', { quantity: 1, unit: 'piece', expectedRevision: seeded.revision });
  assert.equal((await request('/api/recipes?q=steamed')).total > 0, true);
  assert.equal((await request('/api/recommendations/staples')).total > 0, true);
  assert.equal((await request('/api/inspiration')).recipes.length > 0, true);
  const nutrition = await request('/api/nutrition');
  assert.equal(nutrition.estimatedCount, 21);
  assert(nutrition.nutrition.some(recipe => recipe.status === 'unavailable'));
  await stop();

  const backup = await initializeDatabase(backupPath);
  const store = new Store(backup);
  store.onboard({ mode: 'sample', expectedRevision: 0 });
  for (const id of ['tomato-eggs', 'scrambled-eggs']) {
    store.selectRecipe({ recipeId: id, expectedRevision: store.getSnapshot().revision });
  }
  const list = store.getSnapshot();
  const shortage = list.shopping.shortages[0];
  store.markPurchased(shortage.ingredientId, {
    unit: shortage.unit, expectedQuantity: shortage.quantity, expectedRevision: list.revision,
  });
  const original = data(store.getSnapshot());
  backup.close();
  const originalHash = digest(backupPath);
  assert.throws(() => start(['--import', backupPath]), /already has a database/);
  env.PANTRY_LITE_DATA_DIR = join(scratch, 'imported data');
  assert.match(start(['--import', backupPath]), /Imported a copy/);
  await launch();
  assert.deepEqual(data(await request('/api/snapshot')), original);
  await stop();
  await launch();
  assert.deepEqual(data(await request('/api/snapshot')), original);
  assert.equal(digest(backupPath), originalHash);
  console.log('Lite smoke passed: extracted dependencies, loopback startup, duplicate and occupied ports, offline assets and APIs, backup import, and restart persistence.');
} finally {
  await stop();
  rmSync(scratch, { recursive: true, force: true });
}
