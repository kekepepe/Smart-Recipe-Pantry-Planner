import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../server/app.js';
import { Store } from '../../server/services/store.js';
import { openDatabase } from '../../server/db/connection.js';
import { fixture, listen } from '../helpers.js';
async function setup(t, options) {
  const f = fixture(); const server = await listen(createApp(f.db, options));
  t.after(async () => { await server.close(); f.close(); }); return { ...f, ...server };
}

test('A01/A03: database snapshot has 20 sourced recipes; empty pantry is browsable', async t => {
  const api = await setup(t); const { status, data, headers } = await api.request('/snapshot');
  assert.equal(status, 200); assert.equal(data.recipes.length, 20); assert.equal(data.ingredients.length, 50);
  assert.deepEqual(data.pantry, []); assert.equal(data.initialized, false);
  assert(data.evaluations.every(r => r.status === 'needsShopping')); assert.equal(headers.get('cache-control'), 'no-store');
  assert.equal(data.recipes.filter(r => r.sourceLicense === 'Unlicense' && r.sourceRevision && r.sourceUrl).length, 18);
});

test('A01/A06/A07: sample, repeated selection, pantry updates and clear are atomic', async t => {
  const api = await setup(t); let r = await api.request('/onboarding', 'POST', { mode: 'sample', expectedRevision: 0 });
  assert.equal(r.status, 200); let s = r.data;
  assert.equal(s.evaluations.find(r => r.recipeId === 'scrambled-eggs').status, 'ready');
  for (let i = 0; i < 2; i++) { r = await api.request('/shopping-selection', 'PUT', { recipeId: 'tomato-skillet', expectedRevision: s.revision }); assert.equal(r.status, 200); s = r.data; assert.deepEqual(s.shopping.shortages, [{ ingredientId: 'tomato', quantity: 1, unit: 'piece' }]); }
  assert.equal(s.pantry.find(i => i.ingredientId === 'tomato').quantity, 1);
  r = await api.request('/pantry/tomato', 'PUT', { quantity: 2, unit: 'piece', expectedRevision: s.revision }); s = r.data;
  assert.equal(r.status, 200); assert.equal(s.shopping.status, 'ready'); assert.deepEqual(s.shopping.shortages, []);
  r = await api.request('/pantry/tomato', 'DELETE', { expectedRevision: s.revision }); s = r.data;
  assert.equal(s.shopping.shortages[0].quantity, 2);
  assert.equal(api.db.prepare('SELECT pantry_version FROM shopping_lists').get().pantry_version, s.pantryVersion);
  r = await api.request('/shopping-selection', 'DELETE', { expectedRevision: s.revision }); assert.equal(r.data.shopping, null); assert.equal(r.data.pantry.length, 1);
});

test('A04: direct HTTP rejects bad quantities, units, IDs and ownership fields without writes', async t => {
  const api = await setup(t);
  for (const quantity of [-1, 1000001, 1.5, 0.001, null, '2', {}, []]) {
    const r = await api.request('/pantry/egg', 'PUT', { quantity, unit: 'piece', expectedRevision: 0 }); assert.equal(r.status, 422, JSON.stringify(quantity));
  }
  assert.equal((await api.request('/pantry/egg', 'PUT', { quantity: 2, unit: 'ml', expectedRevision: 0 })).status, 422);
  assert.equal((await api.request('/pantry/unknown', 'PUT', { quantity: 2, unit: 'g', expectedRevision: 0 })).status, 404);
  assert.equal((await api.request('/pantry/egg', 'PUT', { quantity: 2, unit: 'piece', expectedRevision: 0, workspaceId: 'other' })).status, 400);
  assert.equal((await api.request('/pantry/egg', 'PUT', { quantity: 2, unit: 'piece' })).status, 400);
  const malformed = await fetch(api.url + '/api/pantry/egg', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{"quantity":NaN}' });
  assert.equal(malformed.status, 400); const body = await malformed.json(); assert.equal(body.error.code, 'INVALID_JSON'); assert(body.error.requestId);
  assert.equal((await api.request('/snapshot')).data.revision, 0);
});

test('A05: changing units invalidates the entire saved list and refuses a new invalid choice', async t => {
  const api = await setup(t); const store = new Store(api.db);
  let s = store.onboard({ mode: 'sample', expectedRevision: 0 }); s = store.selectRecipe({ recipeId: 'tomato-skillet', expectedRevision: s.revision });
  let r = await api.request('/pantry/tomato', 'PUT', { quantity: 100, unit: 'g', expectedRevision: s.revision });
  assert.equal(r.status, 200); s = r.data; assert.equal(s.shopping.status, 'checkUnits'); assert.deepEqual(s.shopping.shortages, []);
  assert.equal(api.db.prepare('SELECT count(*) n FROM shopping_list_items').get().n, 0);
  r = await api.request('/shopping-selection', 'PUT', { recipeId: 'tomato-skillet', expectedRevision: s.revision });
  assert.equal(r.status, 422); assert.equal((await api.request('/snapshot')).data.revision, s.revision);
});

test('A13: concurrent same-revision writes allow one writer and return 409 to the other', async t => {
  const api = await setup(t);
  const results = await Promise.all([2, 3].map(quantity => api.request('/pantry/egg', 'PUT', { quantity, unit: 'piece', expectedRevision: 0 })));
  assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
  const s = (await api.request('/snapshot')).data; assert.equal(s.revision, 1); assert.equal(s.pantry.length, 1);
});

test('A14: first ordinary write initializes the workspace; onboarding can never overwrite it', async t => {
  const api = await setup(t); let r = await api.request('/pantry/egg', 'PUT', { quantity: 7, unit: 'piece', expectedRevision: 0 });
  assert.equal(r.data.initialized, true);
  r = await api.request('/onboarding', 'POST', { mode: 'sample', expectedRevision: r.data.revision }); assert.equal(r.status, 409);
  assert.equal((await api.request('/snapshot')).data.pantry[0].quantity, 7);
});

test('local write origin and JSON boundary reject cross-site posts and unknown routes', async t => {
  const api = await setup(t);
  assert.equal((await api.request('/onboarding', 'POST', { mode: 'empty', expectedRevision: 0 }, { Origin: 'https://foreign.example' })).status, 403);
  const res = await fetch(api.url + '/api/onboarding', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: '{}' });
  assert.equal(res.status, 415); assert.equal((await api.request('/reset', 'POST', {})).status, 404);
  assert.equal((await api.request('/health')).status, 200);
});

test('A10: actual read-only SQLite rejection becomes 503, not false success or leaked SQL', async t => {
  const f = fixture(); const readonly = openDatabase(f.path, { readonly: true }); const api = await listen(createApp(readonly));
  t.after(async () => { await api.close(); readonly.close(); f.close(); });
  const r = await api.request('/pantry/egg', 'PUT', { quantity: 2, unit: 'piece', expectedRevision: 0 });
  assert.equal(r.status, 503); assert.equal(r.data.error.code, 'STORAGE_UNAVAILABLE');
  assert(!JSON.stringify(r.data).includes(f.path)); assert.equal((await api.request('/snapshot')).data.revision, 0);
  const recovered = new Store(f.db).saveItem('egg', { quantity: 2, unit: 'piece', expectedRevision: 0 }); assert.equal(recovered.pantry[0].quantity, 2);
});
