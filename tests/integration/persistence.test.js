import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { fixture } from '../helpers.js';
import { openDatabase } from '../../server/db/connection.js';
import { migrate, assertSchema } from '../../server/db/migrate.js';
import { seed, catalogVersion } from '../../server/db/seed.js';
import { Store } from '../../server/services/store.js';
import { root, config } from '../../server/config.js';
import { ingredients, recipes } from '../../data/catalog.js';

test('A11: failure between pantry write and list rebuild rolls back rows, selection and versions', t => {
  const f = fixture(); t.after(f.close); const store = new Store(f.db);
  let s = store.onboard({ mode: 'sample', expectedRevision: 0 }); s = store.selectRecipe({ recipeId: 'tomato-skillet', expectedRevision: s.revision });
  const broken = new Store(f.db, { fault() { throw new Error('INJECTED_AFTER_WRITE'); } });
  assert.throws(() => broken.saveItem('tomato', { quantity: 2, unit: 'piece', expectedRevision: s.revision }), /INJECTED_AFTER_WRITE/);
  assert.deepEqual(store.getSnapshot(), s);
});

test('A08: decimal stock and requirements persist with exact hundredth precision', t => {
  const f = fixture(); t.after(f.close); const store = new Store(f.db);
  const s = store.saveItem('salt', { quantity: 0.1, unit: 'g', expectedRevision: 0 });
  assert.equal(s.evaluations.find(r => r.recipeId === 'smashed-cucumber').shortages.find(i => i.ingredientId === 'salt').quantity, 0.5);
  assert.equal(f.db.prepare('SELECT quantity_minor n FROM pantry_items').get().n, 10);
});

test('A15/A14: repeat migrations and seed preserve pantry, revision and selection', t => {
  const f = fixture(); t.after(f.close); const store = new Store(f.db);
  let s = store.onboard({ mode: 'sample', expectedRevision: 0 }); s = store.selectRecipe({ recipeId: 'tomato-skillet', expectedRevision: s.revision });
  migrate(f.db); assert.equal(seed(f.db), false); assert.deepEqual(store.getSnapshot(), s);
  assert.equal(f.db.prepare('SELECT count(*) n FROM schema_migrations').get().n, 1);
});

test('A15: unknown migration versions and changed checksums stop startup/migration', t => {
  const f = fixture(); t.after(f.close);
  f.db.prepare("UPDATE schema_migrations SET checksum='changed'").run();
  assert.throws(() => migrate(f.db), /Unsupported or modified/);
  f.db.prepare('INSERT INTO schema_migrations VALUES (99,?,?)').run('future', 'later');
  assert.throws(() => assertSchema(f.db), /Unsupported or modified/);
});

test('explicit catalog upgrade rebuilds old list versions without overwriting inventory', t => {
  const f = fixture(); t.after(f.close); const store = new Store(f.db);
  let s = store.onboard({ mode: 'sample', expectedRevision: 0 }); s = store.selectRecipe({ recipeId: 'tomato-skillet', expectedRevision: s.revision });
  f.db.prepare("UPDATE catalog_metadata SET version='previous-catalog'").run();
  assert.throws(() => seed(f.db), /Catalog changed/); assert.throws(() => store.getSnapshot(), /needs repair/);
  seed(f.db, { upgrade: true }); const next = store.getSnapshot();
  assert.deepEqual(next.pantry, s.pantry); assert.equal(next.catalogVersion, catalogVersion); assert.equal(next.revision, s.revision + 1); assert.deepEqual(next.shopping.shortages, s.shopping.shortages);
});

test('corrupt shopping cache is rejected, then controlled repair restores exact derived quantities', t => {
  const f = fixture(); t.after(f.close); const store = new Store(f.db);
  let s = store.onboard({ mode: 'sample', expectedRevision: 0 }); s = store.selectRecipe({ recipeId: 'tomato-skillet', expectedRevision: s.revision });
  f.db.prepare('UPDATE shopping_list_items SET quantity_minor=900').run();
  assert.throws(() => store.getSnapshot(), /needs repair/);
  f.db.transaction(() => store.rebuildShopping()).immediate(); assert.deepEqual(store.getSnapshot(), s);
});

test('A16: online backup and restore into a new path reproduce exact saved state; checksum tamper is rejected', t => {
  const f = fixture(); t.after(f.close); const store = new Store(f.db);
  let s = store.onboard({ mode: 'sample', expectedRevision: 0 }); s = store.selectRecipe({ recipeId: 'tomato-skillet', expectedRevision: s.revision });
  const backup = join(f.dir, 'backup.sqlite'); const restored = join(f.dir, 'restored.sqlite');
  const cli = args => execFileSync(process.execPath, ['scripts/db.js', ...args], { cwd: root, env: { ...process.env, DB_PATH: f.path }, encoding: 'utf8' });
  cli(['backup', backup]); store.saveItem('egg', { quantity: 9, unit: 'piece', expectedRevision: s.revision });
  cli(['restore', backup, restored]); const copy = openDatabase(restored);
  try { assert.equal(copy.pragma('integrity_check', { simple: true }), 'ok'); assert.deepEqual(new Store(copy).getSnapshot(), s); } finally { copy.close(); }
  assert.throws(() => cli(['restore', backup, restored]), /Restore requires a new destination/);
  writeFileSync(backup + '.json', JSON.stringify({ sha256: 'invalid' })); assert.throws(() => cli(['restore', backup, join(f.dir, 'bad.sqlite')]), /checksum/);
});

test('catalog: all 20 images exist, all ingredients are unique and every new recipe has pinned source and adaptation notes', () => {
  assert.equal(recipes.length, 20); assert.equal(new Set(ingredients.map(i => i.id)).size, ingredients.length);
  for (const recipe of recipes) {
    assert(existsSync(join(root, 'public', recipe.image)), recipe.id);
    if (recipe.sourceLicense === 'Unlicense') {
      assert(recipe.sourceUrl.includes(recipe.sourceRevision)); assert(recipe.adaptationNotes.length > 20);
      const source = readFileSync(join(root, 'data/sources/howtocook', recipe.id + '.md'), 'utf8'); assert(source.startsWith('#'));
    }
  }
});

test('startup refuses missing databases and externally bound configuration', t => {
  const f = fixture(); t.after(f.close); const missing = join(f.dir, 'missing.sqlite');
  assert.throws(() => openDatabase(missing)); assert(!existsSync(missing));
  assert.throws(() => config({ HOST: '0.0.0.0' }), /loopback/);
});

test('A09: saved data survives actual service process termination and restart', async t => {
  const f = fixture(); t.after(f.close);
  const port = await new Promise(resolve => { const server = createServer(); server.listen(0, '127.0.0.1', () => { const p = server.address().port; server.close(() => resolve(p)); }); });
  let child;
  const stop = async () => { if (!child || child.exitCode !== null) return; const current = child; await new Promise(resolve => { current.once('exit', resolve); current.kill('SIGTERM'); }); };
  t.after(stop);
  const start = () => new Promise((resolve, reject) => {
    child = spawn(process.execPath, ['server/index.js'], { cwd: root, env: { ...process.env, DB_PATH: f.path, PORT: String(port), HOST: '127.0.0.1' }, stdio: ['ignore', 'pipe', 'pipe'] });
    const timer = setTimeout(() => { child.kill(); reject(new Error('Service startup timeout')); }, 5000);
    child.stdout.on('data', chunk => { if (String(chunk).includes('listening at')) { clearTimeout(timer); resolve(); } });
    child.once('exit', code => { clearTimeout(timer); if (code) reject(new Error('Startup exited ' + code)); });
  });
  await start(); const url = `http://127.0.0.1:${port}/api`;
  let response = await fetch(url + '/onboarding', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'sample', expectedRevision: 0 }) });
  let s = await response.json();
  response = await fetch(url + '/shopping-selection', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recipeId: 'tomato-skillet', expectedRevision: s.revision }) });
  assert.equal(response.status, 200); s = await response.json(); await stop(); await start();
  assert.deepEqual(await (await fetch(url + '/snapshot')).json(), s); await stop();
});
