import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../server/app.js';
import { Store } from '../../server/services/store.js';
import { fixture, listen } from '../helpers.js';

const GROUP_RANK = { staplesReady: 0, partialMatch: 1, checkUnits: 2 };

test('staple recommendations API: candidates, ordering and explainability on the sample pantry', async t => {
  const f = fixture(); const api = await listen(createApp(f.db));
  t.after(async () => { await api.close(); f.close(); });
  await api.request('/onboarding', 'POST', { mode: 'sample', expectedRevision: 0 }); // egg 2 piece, tomato 1 piece

  const r = await api.request('/recommendations/staples');
  assert.equal(r.status, 200);
  const { recommendations, total, hasStapleMatch, appliedFilters, catalogVersion, pantryRevision } = r.data;
  assert.equal(total, 43); // fixed seeded catalog; hand-verified against the 100-dish catalog
  assert.equal(hasStapleMatch, true);
  assert.equal(appliedFilters.q, '');
  assert.equal(typeof catalogVersion, 'string');
  assert.equal(pantryRevision, 1);

  // Group ordering: staplesReady first, then partialMatch, then checkUnits.
  const ranks = recommendations.map(x => GROUP_RANK[x.group]);
  assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b));
  // No non-candidate leaks through: every entry owns at least one staple.
  assert(recommendations.every(x => x.ownedKinds > 0 && x.stapleTotal > 0));

  // Egg-only recipes are staples ready; tied on ratios so stable ID decides.
  assert.deepEqual(recommendations.slice(0, 2).map(x => x.recipeId), ['scrambled-eggs', 'steamed-eggs']);
  assert.deepEqual(recommendations[1], {
    recipeId: 'steamed-eggs', title: 'Silky steamed eggs', titleZh: '蒸水蛋',
    group: 'staplesReady', stapleTotal: 1, ownedKinds: 1, sufficientKinds: 1,
    insufficientKinds: 0, missingKinds: 0, unitCheckKinds: 0,
    sufficientRatio: 1, ownedRatio: 1,
    staples: [{ ingredientId: 'egg', required: [{ unit: 'piece', quantity: 2 }], pantryQuantity: 2, pantryUnit: 'piece', state: 'sufficient' }],
    missingSeasonings: [{ ingredientId: 'salt', quantity: 2, unit: 'g' }], // staples ready, seasonings still missing
  });

  // tomato-eggs: both staples insufficient (egg 2/3, tomato 1/2), fully owned, no seasoning hits.
  const tomatoEggs = recommendations.find(x => x.recipeId === 'tomato-eggs');
  assert.equal(tomatoEggs.group, 'partialMatch');
  assert.deepEqual(tomatoEggs.staples, [
    { ingredientId: 'egg', required: [{ unit: 'piece', quantity: 3 }], pantryQuantity: 2, pantryUnit: 'piece', state: 'insufficient' },
    { ingredientId: 'tomato', required: [{ unit: 'piece', quantity: 2 }], pantryQuantity: 1, pantryUnit: 'piece', state: 'insufficient' },
  ]);
  assert.equal(tomatoEggs.sufficientRatio, 0);
  assert.equal(tomatoEggs.ownedRatio, 1);
  assert.deepEqual(tomatoEggs.missingSeasonings, [{ ingredientId: 'oil', quantity: 12, unit: 'ml' }, { ingredientId: 'salt', quantity: 3, unit: 'g' }]);

  // Seasonings never generate candidates or alter scores: salt/oil do not appear as staples.
  assert(recommendations.every(x => x.staples.every(s => !['salt', 'oil', 'soy-sauce'].includes(s.ingredientId))));
});

test('staple recommendations API: shares the discovery filters and validates them identically', async t => {
  const f = fixture(); const api = await listen(createApp(f.db));
  t.after(async () => { await api.close(); f.close(); });
  await api.request('/onboarding', 'POST', { mode: 'sample', expectedRevision: 0 });

  const cn = await api.request('/recommendations/staples?countries=cn');
  assert.equal(cn.status, 200);
  assert.equal(cn.data.total, 8);
  assert.deepEqual(cn.data.appliedFilters.countries, ['cn']); // normalized echo keeps URL state restorable
  assert.equal(cn.data.recommendations[0].recipeId, 'steamed-eggs');
  assert(!cn.data.recommendations.some(x => x.recipeId === 'scrambled-eggs')); // Demo recipe has no country tags

  const q = await api.request('/recommendations/staples?q=' + encodeURIComponent('steamed'));
  assert.deepEqual(q.data.recommendations.map(x => x.recipeId), ['steamed-eggs']);

  const multi = await api.request('/recommendations/staples?countries=cn&meals=breakfast');
  assert.equal(multi.status, 200);
  assert(multi.data.recommendations.every(x => x.recipeId !== 'tomato-eggs')); // tomato-eggs is not a breakfast tag

  for (const bad of ['meals=bad', 'unexpected=x', 'countries=jp&regions=sichuan']) {
    const r = await api.request('/recommendations/staples?' + bad);
    assert.equal(r.status, 400, bad);
    assert.equal(r.data.error.code, 'INVALID_FILTER', bad);
  }
});

test('staple recommendations API: uncomparable units force checkUnits and are never sufficient', async t => {
  const f = fixture(); const api = await listen(createApp(f.db));
  t.after(async () => { await api.close(); f.close(); });
  let s = (await api.request('/onboarding', 'POST', { mode: 'sample', expectedRevision: 0 })).data;
  s = (await api.request('/pantry/tomato', 'PUT', { quantity: 500, unit: 'g', expectedRevision: s.revision })).data;

  const r = await api.request('/recommendations/staples');
  const tomatoEggs = r.data.recommendations.find(x => x.recipeId === 'tomato-eggs');
  assert.equal(tomatoEggs.group, 'checkUnits'); // 500 g cannot be compared against a 2-piece need
  const tomato = tomatoEggs.staples.find(x => x.ingredientId === 'tomato');
  assert.equal(tomato.state, 'unitCheck');
  assert.equal(tomato.pantryUnit, 'g');
  assert.equal(tomatoEggs.unitCheckKinds, 1);
  assert.equal(tomatoEggs.sufficientKinds, 0); // egg 2/3 is insufficient; only the comparable kinds score
  assert.equal(tomatoEggs.insufficientKinds, 1);
});

test('staple recommendations API: empty or seasoning-only pantry yields no candidates with the explicit empty reason', async t => {
  const f = fixture(); const api = await listen(createApp(f.db));
  t.after(async () => { await api.close(); f.close(); });

  // Pre-onboarding the workspace row already exists with an empty pantry: same behavior as /api/recipes.
  const ghost = await api.request('/recommendations/staples');
  assert.equal(ghost.status, 200);
  assert.equal(ghost.data.total, 0);
  assert.equal(ghost.data.hasStapleMatch, false);

  await api.request('/onboarding', 'POST', { mode: 'empty', expectedRevision: 0 });
  const empty = await api.request('/recommendations/staples');
  assert.equal(empty.status, 200);
  assert.equal(empty.data.total, 0);
  assert.equal(empty.data.hasStapleMatch, false);

  // Only seasonings in stock: still the "no staple match" empty state.
  let s = (await api.request('/snapshot')).data;
  s = (await api.request('/pantry/salt', 'PUT', { quantity: 100, unit: 'g', expectedRevision: s.revision })).data;
  const seasoningOnly = await api.request('/recommendations/staples');
  assert.equal(seasoningOnly.data.total, 0);
  assert.equal(seasoningOnly.data.hasStapleMatch, false);
});

test('staple recommendations API: read-only, deterministic and revision-stable', async t => {
  const f = fixture(); const api = await listen(createApp(f.db));
  t.after(async () => { await api.close(); f.close(); });
  await api.request('/onboarding', 'POST', { mode: 'sample', expectedRevision: 0 });
  const before = new Store(f.db).getSnapshot();

  const first = await api.request('/recommendations/staples');
  const second = await api.request('/recommendations/staples');
  assert.equal(first.status, 200);
  assert.deepEqual(first.data, second.data); // same input, byte-identical output

  const after = new Store(f.db).getSnapshot();
  assert.deepEqual(after, before); // no writes, no revision bump, no derived-row churn
  assert.equal(after.revision, before.revision);
});
