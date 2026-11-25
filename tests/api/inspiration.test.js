import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../server/app.js';
import { Store } from '../../server/services/store.js';
import { fixture, listen } from '../helpers.js';

test('daily inspiration API (B11/C07): works on empty pantry and recipeIds stay unchanged after pantry mutations while shortages update', async t => {
  const f = fixture();
  let current = new Date('2026-11-25T08:00:00.000Z'); // 2026-11-25 16:00 Asia/Shanghai
  const api = await listen(createApp(f.db, { now: () => current }));
  t.after(async () => { await api.close(); f.close(); });

  const beforeSnapshot = new Store(f.db).getSnapshot();
  assert.deepEqual(beforeSnapshot.pantry, []);

  // Empty pantry still yields 3 distinct picks with real shortages.
  const emptyRes = await api.request('/inspiration');
  assert.equal(emptyRes.status, 200);
  assert.equal(emptyRes.data.date, '2026-11-25');
  assert.equal(emptyRes.data.timezone, 'Asia/Shanghai');
  assert.equal(emptyRes.data.pantryIndependent, true);
  assert.equal(emptyRes.data.totalCandidates, 100);
  assert.equal(emptyRes.data.count, 3);
  assert.equal(new Set(emptyRes.data.recipeIds).size, 3);
  assert.equal(emptyRes.data.evaluations.length, 3);
  assert(emptyRes.data.evaluations.every(ev => ev.status === 'needsShopping' && ev.shortages.length > 0));

  // Read-only: revision and snapshot are untouched.
  assert.deepEqual(new Store(f.db).getSnapshot(), beforeSnapshot);

  // Stock every required ingredient of the first picked recipe in the pantry.
  const target = emptyRes.data.recipes[0];
  let rev = beforeSnapshot.revision;
  for (const req of target.requirements) {
    const save = await api.request(`/pantry/${encodeURIComponent(req.ingredientId)}`, 'PUT', {
      quantity: req.quantity,
      unit: req.unit,
      expectedRevision: rev,
    });
    assert.equal(save.status, 200);
    rev = save.data.revision;
  }

  // Same Shanghai date & filters: recipeIds MUST remain identical, while real availability updates to ready!
  const stockedRes = await api.request('/inspiration');
  assert.equal(stockedRes.status, 200);
  assert.deepEqual(stockedRes.data.recipeIds, emptyRes.data.recipeIds);
  assert.equal(stockedRes.data.pantryRevision, rev);
  const updatedEval = stockedRes.data.evaluations.find(ev => ev.recipeId === target.id);
  assert.equal(updatedEval.status, 'ready');
  assert.deepEqual(updatedEval.shortages, []);
});

test('daily inspiration API (B12): fixed clock repeatability and Asia/Shanghai midnight rollover', async t => {
  const f = fixture();
  let current = new Date('2026-11-25T15:59:59.000Z'); // 23:59:59 Asia/Shanghai
  const api = await listen(createApp(f.db, { now: () => current }));
  t.after(async () => { await api.close(); f.close(); });

  const a = await api.request('/inspiration');
  const b = await api.request('/inspiration');
  assert.equal(a.status, 200);
  assert.deepEqual(a.data, b.data);
  assert.equal(a.data.date, '2026-11-25');

  // 1 second later crosses 00:00:00 Asia/Shanghai -> next day.
  current = new Date('2026-11-25T16:00:00.000Z');
  const nextDay = await api.request('/inspiration');
  assert.equal(nextDay.status, 200);
  assert.equal(nextDay.data.date, '2026-11-26');
  assert.equal(nextDay.data.timezone, 'Asia/Shanghai');
  assert.equal(nextDay.data.count, 3);
  assert.equal(new Set(nextDay.data.recipeIds).size, 3);
  assert.notDeepEqual(nextDay.data.recipeIds, a.data.recipeIds);
});

test('daily inspiration API: shares discovery filters, handles <3 and 0 matches, and rejects invalid filters with 400', async t => {
  const f = fixture();
  const api = await listen(createApp(f.db, { now: () => new Date('2026-11-25T08:00:00.000Z') }));
  t.after(async () => { await api.close(); f.close(); });

  // Fewer than 3 matching recipes returns exact actual count (Sichuan has 2 in the 100-recipe catalog).
  const sichuan = await api.request('/inspiration?regions=sichuan');
  assert.equal(sichuan.status, 200);
  assert.equal(sichuan.data.totalCandidates, 2);
  assert.equal(sichuan.data.count, 2);
  assert.equal(sichuan.data.recipeIds.length, 2);
  assert.deepEqual(sichuan.data.appliedFilters.regions, ['sichuan']);

  // Parameter order independence.
  const combo1 = await api.request('/inspiration?countries=cn&tastes=spicy,savory&meals=dinner');
  const combo2 = await api.request('/inspiration?meals=dinner&tastes=savory&tastes=spicy&countries=cn');
  assert.equal(combo1.status, 200);
  assert.deepEqual(combo1.data.recipeIds, combo2.data.recipeIds);

  // Zero matches returns explicit empty result without relaxing filters.
  const zero = await api.request('/inspiration?tastes=bitter');
  assert.equal(zero.status, 200);
  assert.equal(zero.data.totalCandidates, 0);
  assert.equal(zero.data.count, 0);
  assert.deepEqual(zero.data.recipeIds, []);
  assert.deepEqual(zero.data.recipes, []);

  // Invalid filters, unknown category, contradictory country/region, and spoofed date param all return 400.
  for (const bad of [
    'category=bad-category-zz',
    'countries=jp&regions=sichuan',
    'meals=bad',
    'availability=bad',
    'date=2026-11-25',
    'unexpected=x',
  ]) {
    const res = await api.request(`/inspiration?${bad}`);
    assert.equal(res.status, 400, bad);
    assert.equal(res.data.error.code, 'INVALID_FILTER', bad);
  }
});
