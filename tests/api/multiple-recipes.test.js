import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, listen } from '../helpers.js';
import { createApp } from '../../server/app.js';
import { Store } from '../../server/services/store.js';

test('multi-recipe HTTP: append, deduplicate, total demand, stock changes, remove and clear', async t => {
  const f = fixture(); const api = await listen(createApp(f.db));
  t.after(async () => { await api.close(); f.close(); });
  let s = (await api.request('/onboarding', 'POST', { mode: 'sample', expectedRevision: 0 })).data;
  const add = async id => { const r = await api.request('/shopping-selection', 'PUT', { recipeId: id, expectedRevision: s.revision }); assert.equal(r.status, 200); s = r.data; };
  await add('tomato-skillet'); await add('tomato-eggs'); await add('tomato-eggs');
  assert.deepEqual(s.shoppingRecipeIds, ['tomato-skillet', 'tomato-eggs']);
  assert.deepEqual(s.shoppingRecipes.map(r => r.shortages.find(i => i.ingredientId === 'tomato').quantity), [1, 1]);
  assert.equal(s.shopping.shortages.find(i => i.ingredientId === 'tomato').quantity, 3);
  assert.equal(s.pantry.find(i => i.ingredientId === 'tomato').quantity, 1);
  assert.equal(f.db.prepare('SELECT count(*) n FROM shopping_selections').get().n, 2);
  s = (await api.request('/pantry/tomato', 'PUT', { quantity: 3, unit: 'piece', expectedRevision: s.revision })).data;
  assert.equal(s.shopping.shortages.find(i => i.ingredientId === 'tomato').quantity, 1);
  s = (await api.request('/shopping-selection/tomato-eggs', 'DELETE', { expectedRevision: s.revision })).data;
  assert.deepEqual(s.shoppingRecipeIds, ['tomato-skillet']); assert.equal(s.shopping.status, 'ready');
  s = (await api.request('/shopping-selection/tomato-skillet', 'DELETE', { expectedRevision: s.revision })).data;
  assert.deepEqual(s.shoppingRecipes, []); assert.equal(s.shopping, null); assert.equal(s.pantry.find(i => i.ingredientId === 'tomato').quantity, 3);
  await add('tomato-eggs');
  s = (await api.request('/shopping-selection', 'DELETE', { expectedRevision: s.revision })).data;
  assert.equal(s.shopping, null); assert.equal(f.db.prepare('SELECT count(*) n FROM shopping_selections').get().n, 0);
});

test('multi-recipe: failed additions/removals roll back all selections, totals and versions', t => {
  const f = fixture(); t.after(f.close); const store = new Store(f.db);
  let s = store.onboard({ mode: 'sample', expectedRevision: 0 }); s = store.selectRecipe({ recipeId: 'tomato-skillet', expectedRevision: s.revision });
  const failed = new Store(f.db, { fault() { throw new Error('WRITE_ABORTED'); } });
  assert.throws(() => failed.selectRecipe({ recipeId: 'tomato-eggs', expectedRevision: s.revision }), /WRITE_ABORTED/);
  assert.deepEqual(store.getSnapshot(), s);
  assert.throws(() => failed.removeRecipe('tomato-skillet', { expectedRevision: s.revision }), /WRITE_ABORTED/);
  assert.deepEqual(store.getSnapshot(), s);
});
