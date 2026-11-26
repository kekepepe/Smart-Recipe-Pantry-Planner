import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { createApp } from '../../server/app.js';
import { openDatabase } from '../../server/db/connection.js';
import { migrate, migrations } from '../../server/db/migrate.js';
import { seed } from '../../server/db/seed.js';
import { Store } from '../../server/services/store.js';
import { root } from '../../server/config.js';
import { createDesktopRememberStore, REMEMBER_FILE_NAME } from '../../desktop/remember-store.js';
import { fixture, listen } from '../helpers.js';

function createJar() {
  const jar = new Map();
  return {
    track(res) {
      for (const raw of (res.headers.getSetCookie?.() || [])) {
        const [pair, ...attrs] = raw.split(';').map(x => x.trim());
        const eq = pair.indexOf('=');
        if (eq <= 0) continue;
        const k = pair.slice(0, eq);
        const v = pair.slice(eq + 1);
        if (!v || attrs.some(a => /^max-age=0/i.test(a))) jar.delete(k);
        else jar.set(k, v);
      }
    },
    header() {
      return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
    },
    clearSession() {
      jar.delete('pantry_session');
    },
  };
}

test('Issue #55 migration: v1.0.1 (schema 004) database upgrades cleanly to 005, preserves all user data, and blocks pre-setup business APIs', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'pantry-v101-upgrade-'));
  const dbPath = join(dir, 'v101.sqlite');
  const backupPath = join(dir, 'pantry-before-upgrade.sqlite');
  t.after(() => rmSync(dir, { recursive: true, force: true }));

  // 1. Construct an authentic v1.0.1 (schema 004) database with pantry, multi-recipe order, and purchased mark.
  const db = openDatabase(dbPath, { create: true });
  t.after(() => { if (db.open) db.close(); });
  db.exec('CREATE TABLE schema_migrations(version INTEGER PRIMARY KEY, checksum TEXT NOT NULL, applied_at TEXT NOT NULL)');
  for (const m of migrations.slice(0, 4)) {
    db.exec(m.sql);
    db.prepare('INSERT INTO schema_migrations VALUES (?,?,?)').run(m.version, m.checksum, '2026-11-20T00:00:00.000Z');
  }
  seed(db);
  const store = new Store(db);
  let snap = store.onboard({ mode: 'sample', expectedRevision: 0 });
  snap = store.saveItem('oil', { quantity: 50, unit: 'ml', expectedRevision: snap.revision });
  snap = store.selectRecipe({ recipeId: 'tomato-eggs', expectedRevision: snap.revision });
  snap = store.selectRecipe({ recipeId: 'egg-fried-rice', expectedRevision: snap.revision });
  snap = store.markPurchased('tomato', { unit: 'piece', expectedQuantity: 1, expectedRevision: snap.revision });

  // Take pre-upgrade backup just like desktop/main.js does.
  await db.backup(backupPath);
  assert(existsSync(backupPath));

  // 2. Run incremental migration 004 -> 005.
  migrate(db);
  assert.equal(db.prepare('SELECT max(version) v FROM schema_migrations').get().v, 5);
  assert.deepEqual(db.pragma('foreign_key_check'), []);

  // 3. Before account setup, business APIs must return 401 and never leak v1.0.1 data.
  const api = await listen(createApp(db), { authenticate: false });
  t.after(async () => { await api.close(); });

  const preStatus = await api.request('/auth/status');
  assert.equal(preStatus.status, 200);
  assert.equal(preStatus.data.initialized, false);
  assert.equal(preStatus.data.authenticated, false);
  assert.equal(preStatus.data.hasExistingData, true);
  assert.equal((await api.request('/snapshot')).status, 401);
  assert.equal((await api.request('/recipes')).status, 401);

  // 4. Complete first-time setup; all existing v1.0.1 pantry, order, shopping totals and purchased marks remain intact.
  const setupRes = await api.request('/auth/setup', 'POST', { username: 'owner', password: 'upgrade-password', rememberMe: false });
  assert.equal(setupRes.status, 201);
  const postSnap = (await api.request('/snapshot')).data;
  assert.deepEqual(postSnap.pantry, snap.pantry);
  assert.deepEqual(postSnap.shoppingRecipeIds, ['tomato-eggs', 'egg-fried-rice']);
  assert.deepEqual(postSnap.shopping.shortages, snap.shopping.shortages);
  assert.deepEqual(postSnap.purchasedMarks, snap.purchasedMarks);

  // 5. Verify pre-upgrade backup is readable and still at schema 004.
  const backupDb = openDatabase(backupPath, { readonly: true });
  try {
    assert.equal(backupDb.pragma('integrity_check', { simple: true }), 'ok');
    assert.equal(backupDb.prepare('SELECT max(version) v FROM schema_migrations').get().v, 4);
  } finally {
    backupDb.close();
  }
});

test('Issue #55 process restart: unchecked remember-me requires re-login; checked remember-me auto-restores; logout stops auto-restore', async t => {
  const f = fixture();
  t.after(f.close);
  const port = await new Promise(resolve => {
    const srv = createServer();
    srv.listen(0, '127.0.0.1', () => { const p = srv.address().port; srv.close(() => resolve(p)); });
  });
  let child;
  const stop = async () => {
    const current = child; child = null;
    if (!current || current.exitCode !== null || current.signalCode !== null) return;
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Service shutdown timeout')), 5000);
      current.once('exit', () => { clearTimeout(timer); resolve(); });
      current.kill('SIGTERM');
    });
  };
  t.after(stop);
  const start = () => new Promise((resolve, reject) => {
    child = spawn(process.execPath, ['server/index.js'], {
      cwd: root,
      env: { ...process.env, DB_PATH: f.path, PORT: String(port), HOST: '127.0.0.1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const timer = setTimeout(() => { child.kill(); reject(new Error('Service startup timeout')); }, 5000);
    child.stdout.on('data', chunk => { if (String(chunk).includes('listening at')) { clearTimeout(timer); resolve(); } });
    child.once('exit', code => { clearTimeout(timer); if (code) reject(new Error('Startup exited ' + code)); });
  });

  const url = `http://127.0.0.1:${port}/api`;
  const jar = createJar();

  // Case 1: Setup with rememberMe = false -> restart requires password again.
  await start();
  let res = await fetch(`${url}/auth/setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'procuser', password: 'password123', rememberMe: false }),
  });
  assert.equal(res.status, 201);
  jar.track(res);
  assert.equal((await fetch(`${url}/snapshot`, { headers: { Cookie: jar.header() } })).status, 200);

  await stop();
  await start();
  res = await fetch(`${url}/auth/status`, { headers: { Cookie: jar.header() } });
  assert.equal((await res.json()).authenticated, false, 'non-remembered session must not survive server restart');
  assert.equal((await fetch(`${url}/snapshot`, { headers: { Cookie: jar.header() } })).status, 401);

  // Case 2: Sign in with rememberMe = true -> restart auto-restores session!
  res = await fetch(`${url}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'procuser', password: 'password123', rememberMe: true }),
  });
  assert.equal(res.status, 200);
  jar.track(res);
  jar.clearSession(); // Also simulate browser closing (session cookie discarded)
  await stop();
  await start();
  res = await fetch(`${url}/auth/status`, { headers: { Cookie: jar.header() } });
  jar.track(res);
  const restored = await res.json();
  assert.equal(restored.authenticated, true);
  assert.equal(restored.restoredFromRemember, true);
  assert.equal((await fetch(`${url}/snapshot`, { headers: { Cookie: jar.header() } })).status, 200);

  // Case 3: Explicit logout -> restart stays logged out.
  res = await fetch(`${url}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: jar.header() },
    body: '{}',
  });
  assert.equal(res.status, 200);
  jar.track(res);
  await stop();
  await start();
  res = await fetch(`${url}/auth/status`, { headers: { Cookie: jar.header() } });
  assert.equal((await res.json()).authenticated, false);
  await stop();
});

test('Issue #55 desktopRememberStore: encrypts, decrypts, clears, and rejects corrupted/unavailable OS storage', t => {
  const dir = mkdtempSync(join(tmpdir(), 'pantry-rem-store-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));

  const fakeSafeStorage = {
    available: true,
    isEncryptionAvailable() { return this.available; },
    encryptString(str) { return Buffer.from(`ENC::${str}`, 'utf8'); },
    decryptString(buf) {
      const text = buf.toString('utf8');
      if (!text.startsWith('ENC::')) throw new Error('BAD_CIPHERTEXT');
      return text.slice(5);
    },
  };

  const store = createDesktopRememberStore(dir, fakeSafeStorage);
  assert.equal(store.load(), null);
  store.save('secret-token-xyz');
  assert(existsSync(join(dir, REMEMBER_FILE_NAME)));
  assert.equal(store.load(), 'secret-token-xyz');

  // Corrupt file -> load throws so AuthService clears it cleanly.
  writeFileSync(join(dir, REMEMBER_FILE_NAME), Buffer.from('tampered-bytes'));
  assert.throws(() => store.load(), /BAD_CIPHERTEXT/);
  store.clear();
  assert.equal(store.load(), null);

  // Unavailable OS encryption refuses to write plaintext.
  fakeSafeStorage.available = false;
  assert.throws(() => store.save('secret-token-xyz'), /unavailable/);
});
