import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { fixture } from '../helpers.js';
import { openDatabase } from '../../server/db/connection.js';
import { migrate } from '../../server/db/migrate.js';
import { seed } from '../../server/db/seed.js';
import { Store } from '../../server/services/store.js';
import { root } from '../../server/config.js';

function marked(db) {
  const store = new Store(db);
  let s = store.onboard({ mode: 'sample', expectedRevision: 0 });
  s = store.selectRecipe({ recipeId: 'tomato-eggs', expectedRevision: s.revision });
  return store.markPurchased('egg', { unit: 'piece', expectedQuantity: 1, expectedRevision: s.revision });
}
const cli = (path, ...args) => execFileSync(process.execPath, ['scripts/db.js', ...args], {
  cwd: root, env: { ...process.env, DB_PATH: path }, encoding: 'utf8',
});

test('H02/H04: schema 003 to 004 preserves user rows and repeated migration preserves marks', t => {
  const f = fixture(); t.after(f.close);
  const before = marked(f.db);
  // A schema-003 fixture: 004 is additive, so remove only its table/history in this isolated DB.
  f.db.exec('DROP TABLE purchased_marks; DELETE FROM schema_migrations WHERE version=4');
  const tables = ['pantry_items', 'shopping_selections', 'shopping_lists', 'shopping_list_items', 'workspaces'];
  const rows = () => tables.map(name => f.db.prepare(`SELECT * FROM ${name} ORDER BY rowid`).all());
  const oldRows = rows();
  migrate(f.db);
  assert.deepEqual(rows(), oldRows);
  assert.deepEqual(new Store(f.db).getSnapshot(), { ...before, purchasedMarks: [] });
  const store = new Store(f.db);
  const restored = store.markPurchased('egg', { unit: 'piece', expectedQuantity: 1, expectedRevision: before.revision });
  migrate(f.db); assert.equal(seed(f.db), false);
  assert.deepEqual(store.getSnapshot(), restored);
  assert.deepEqual(f.db.pragma('foreign_key_check'), []);
});

test('H02/H04: CLI backup/restore and a fresh connection preserve exact purchased marks', t => {
  const f = fixture(); t.after(f.close);
  const before = marked(f.db);
  const backup = join(f.dir, 'marks-backup.sqlite');
  const restored = join(f.dir, 'marks-restored.sqlite');
  cli(f.path, 'backup', backup);
  new Store(f.db).unmarkPurchased('egg', { unit: 'piece', expectedRevision: before.revision });
  cli(f.path, 'restore', backup, restored);
  for (let reopen = 0; reopen < 2; reopen++) {
    const copy = openDatabase(restored);
    try {
      assert.deepEqual(new Store(copy).getSnapshot(), before);
      assert.equal(copy.pragma('integrity_check', { simple: true }), 'ok');
      assert.deepEqual(copy.pragma('foreign_key_check'), []);
    } finally { copy.close(); }
  }
});

test('H02/H04: CLI repair rebuilds corrupt cache without losing a valid purchased mark', t => {
  const f = fixture(); t.after(f.close);
  const before = marked(f.db);
  f.db.prepare('UPDATE shopping_list_items SET quantity_minor=900 WHERE ingredient_id=?').run('egg');
  assert.throws(() => new Store(f.db).getSnapshot(), /needs repair/);
  cli(f.path, 'repair');
  const after = new Store(f.db).getSnapshot();
  assert.deepEqual(after, { ...before, revision: before.revision + 1 });
  cli(f.path, 'repair');
  assert.deepEqual(new Store(f.db).getSnapshot(), { ...before, revision: before.revision + 2 });
});

test('H02: SQLite constraints reject invalid marks and derived-row rebuilds cannot cascade marks', t => {
  const f = fixture(); t.after(f.close);
  const before = marked(f.db);
  const insert = f.db.prepare('INSERT INTO purchased_marks VALUES (?,?,?,?,?)');
  for (const quantity of [0, -1, 1.5, 2000000001, 150]) {
    assert.throws(() => insert.run('local', 'tomato', 'piece', quantity, 'fixture'), /CHECK/);
  }
  assert.throws(() => insert.run('local', 'egg', 'piece', 100, 'fixture'), /UNIQUE/);
  assert.throws(() => insert.run('absent', 'tomato', 'piece', 100, 'fixture'), /FOREIGN KEY/);
  assert.throws(() => insert.run('local', 'unknown', 'g', 100, 'fixture'), /FOREIGN KEY/);
  f.db.exec("DELETE FROM shopping_list_items; DELETE FROM shopping_lists;");
  assert.deepEqual(new Store(f.db).purchasedMarks(), before.purchasedMarks);
  f.db.transaction(() => new Store(f.db).rebuildShopping()).immediate();
  assert.deepEqual(new Store(f.db).getSnapshot(), before);
});
