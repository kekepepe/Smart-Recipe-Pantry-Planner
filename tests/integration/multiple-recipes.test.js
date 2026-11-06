import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fixture } from '../helpers.js';
import { Store } from '../../server/services/store.js';
import { openDatabase } from '../../server/db/connection.js';
import { migrate, migrations, assertSchema } from '../../server/db/migrate.js';

test('migration 001→002 retains old pantry, recipe selection and cache; rerun is a no-op', t => {
  const dir = mkdtempSync(join(tmpdir(), 'pantry-v1-upgrade-')); const db = openDatabase(join(dir, 'old.sqlite'), { create: true });
  t.after(() => { db.close(); rmSync(dir, { recursive: true, force: true }); });
  db.exec(migrations[0].sql);
  db.exec('CREATE TABLE schema_migrations(version INTEGER PRIMARY KEY,checksum TEXT NOT NULL,applied_at TEXT NOT NULL)');
  db.prepare('INSERT INTO schema_migrations VALUES (1,?,?)').run(migrations[0].checksum, 'before-upgrade');
  db.exec("INSERT INTO ingredients VALUES ('tomato','Tomatoes','tomato'); INSERT INTO ingredient_units VALUES ('tomato','piece'); INSERT INTO catalog_metadata VALUES (1,'legacy-catalog');");
  db.prepare('INSERT INTO recipes VALUES (?,?)').run('old-recipe', JSON.stringify({ title: 'Old recipe' }));
  db.exec("INSERT INTO recipe_steps VALUES ('old-recipe',0,'Cook the tomatoes.'); INSERT INTO recipe_requirements VALUES ('old-recipe','tomato',200,'piece',0); INSERT INTO pantry_items VALUES ('local','tomato',100,'piece'); UPDATE workspaces SET initialized=1,revision=7,pantry_version=4; INSERT INTO shopping_lists VALUES ('local','old-recipe','needsShopping',4,'legacy-catalog'); INSERT INTO shopping_list_items VALUES ('local','tomato',100,'piece',0);");
  assert.throws(() => assertSchema(db), /migration required/);
  migrate(db); assertSchema(db); const next = new Store(db).getSnapshot();
  assert.equal(next.schemaVersion, 2); assert.equal(next.revision, 8);
  assert.deepEqual(next.pantry, [{ ingredientId: 'tomato', quantity: 1, unit: 'piece' }]);
  assert.deepEqual(next.shoppingRecipeIds, ['old-recipe']); assert.equal(next.shopping.shortages[0].quantity, 1);
  assert.equal(db.pragma('foreign_key_check').length, 0);
  migrate(db); assert.deepEqual(new Store(db).getSnapshot(), next);
});

test('multi-recipe selections and computed cache survive closing/reopening the file', t => {
  const f = fixture(); t.after(f.close); const store = new Store(f.db);
  let s = store.onboard({ mode: 'sample', expectedRevision: 0 });
  for (const id of ['tomato-skillet', 'tomato-eggs']) s = store.selectRecipe({ recipeId: id, expectedRevision: s.revision });
  f.db.close(); const reopened = openDatabase(f.path);
  try { assert.deepEqual(new Store(reopened).getSnapshot(), s); } finally { reopened.close(); }
});
