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

  const r = await api.request('/recommendations/staples?pageSize=50'); // one page for the whole ranked list
  assert.equal(r.status, 200);
  const { recommendations, total, hasStapleMatch, appliedFilters, catalogVersion, pantryRevision } = r.data;
  assert.equal(total, 43); // fixed seeded catalog; hand-verified against the 100-dish catalog
  assert.equal(hasStapleMatch, true);
  assert.equal(appliedFilters.q, '');
  assert.equal(typeof catalogVersion, 'string');
  assert.equal(pantryRevision, 1);
  // Pagination metadata follows the discovery convention.
  assert.deepEqual({ page: r.data.page, pages: r.data.pages, pageSize: r.data.pageSize }, { page: 1, pages: 1, pageSize: 50 });
  assert.equal(recommendations.length, total); // unsliced view of the ranked list

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
    staples: [{ ingredientId: 'egg', required: [{ unit: 'piece', quantity: 2 }], pantryQuantity: 2, pantryUnit: 'piece', shortfallQuantity: 0, state: 'sufficient' }],
    missingSeasonings: [{ ingredientId: 'salt', quantity: 2, unit: 'g' }], // staples ready, seasonings still missing
  });

  // tomato-eggs: both staples insufficient (egg 2/3, tomato 1/2), fully owned, no seasoning hits.
  const tomatoEggs = recommendations.find(x => x.recipeId === 'tomato-eggs');
  assert.equal(tomatoEggs.group, 'partialMatch');
  assert.deepEqual(tomatoEggs.staples, [
    { ingredientId: 'egg', required: [{ unit: 'piece', quantity: 3 }], pantryQuantity: 2, pantryUnit: 'piece', shortfallQuantity: 1, state: 'insufficient' },
    { ingredientId: 'tomato', required: [{ unit: 'piece', quantity: 2 }], pantryQuantity: 1, pantryUnit: 'piece', shortfallQuantity: 1, state: 'insufficient' },
  ]);
  assert.equal(tomatoEggs.sufficientRatio, 0);
  assert.equal(tomatoEggs.ownedRatio, 1);
  assert.deepEqual(tomatoEggs.missingSeasonings, [{ ingredientId: 'oil', quantity: 12, unit: 'ml' }, { ingredientId: 'salt', quantity: 3, unit: 'g' }]);

  // Seasonings never generate candidates or alter scores: salt/oil do not appear as staples.
  assert(recommendations.every(x => x.staples.every(s => !['salt', 'oil', 'soy-sauce'].includes(s.ingredientId))));
});

test('staple recommendations API: returns the exact fractional shortfall in the matching unit', async t => {
  const f = fixture(); const api = await listen(createApp(f.db));
  t.after(async () => { await api.close(); f.close(); });

  const saved = await api.request('/pantry/flour', 'PUT', { quantity: 39.99, unit: 'g', expectedRevision: 0 });
  assert.equal(saved.status, 200);

  const r = await api.request('/recommendations/staples?q=Katsudon');
  assert.equal(r.status, 200);
  const katsudon = r.data.recommendations.find(recipe => recipe.recipeId === 'katsudon');
  assert.deepEqual(katsudon.staples.find(staple => staple.ingredientId === 'flour'), {
    ingredientId: 'flour',
    required: [{ unit: 'g', quantity: 40 }],
    pantryQuantity: 39.99,
    pantryUnit: 'g',
    shortfallQuantity: 0.01,
    state: 'insufficient',
  });
});

test('staple recommendations API: pagination slices the ranked list without re-ranking it', async t => {
  const f = fixture(); const api = await listen(createApp(f.db));
  t.after(async () => { await api.close(); f.close(); });
  await api.request('/onboarding', 'POST', { mode: 'sample', expectedRevision: 0 });

  const full = (await api.request('/recommendations/staples?pageSize=50')).data; // the reference ranking
  const page1 = await api.request('/recommendations/staples?page=1&pageSize=2');
  const page2 = await api.request('/recommendations/staples?page=2&pageSize=2');
  assert.equal(page1.status, 200);
  assert.equal(page2.status, 200);

  // Both pages have two items, share no recipe IDs, and together match the
  // first four entries of the ranked results - slicing, not re-ranking.
  const ids1 = page1.data.recommendations.map(x => x.recipeId);
  const ids2 = page2.data.recommendations.map(x => x.recipeId);
  assert.equal(ids1.length, 2);
  assert.equal(ids2.length, 2);
  assert.equal(ids1.filter(id => ids2.includes(id)).length, 0);
  assert.deepEqual([...ids1, ...ids2], full.recommendations.slice(0, 4).map(x => x.recipeId));

  // total stays the pre-slice count; pagination metadata is consistent.
  assert.equal(page1.data.total, 43);
  assert.equal(page2.data.total, 43);
  assert.deepEqual({ page: page1.data.page, pages: page1.data.pages, pageSize: page1.data.pageSize }, { page: 1, pages: 22, pageSize: 2 });
  assert.equal(page2.data.page, 2);

  // An out-of-range request is clamped to the effective page, echoed in appliedFilters.
  const clamped = await api.request('/recommendations/staples?page=999&pageSize=2');
  assert.equal(clamped.status, 200);
  assert.equal(clamped.data.page, 22); // ceil(43/2)
  assert.equal(clamped.data.appliedFilters.page, 22);
  assert.equal(clamped.data.recommendations.length, 1); // 43 = 21 full pages + 1
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

  // The same invalid category is rejected identically on BOTH routes (shared
  // catalog-aware validation): /api/recipes and the recommendation endpoint.
  for (const path of ['recipes', 'recommendations/staples']) {
    const r = await api.request('/' + path + '?category=bad-category-zz');
    assert.equal(r.status, 400, path);
    assert.equal(r.data.error.code, 'INVALID_FILTER', path);
  }
  for (const bad of ['meals=bad', 'unexpected=x', 'countries=jp&regions=sichuan']) {
    const r = await api.request('/recommendations/staples?' + bad);
    assert.equal(r.status, 400, bad);
    assert.equal(r.data.error.code, 'INVALID_FILTER', bad);
  }
});

test('staple recommendations API: the two empty states are distinguishable signals', async t => {
  const f = fixture(); const api = await listen(createApp(f.db));
  t.after(async () => { await api.close(); f.close(); });
  await api.request('/onboarding', 'POST', { mode: 'sample', expectedRevision: 0 });

  // A search that matches nothing still leaves the pantry usable: P02 offers to
  // clear the filters (hasStapleMatch is computed from the UNFILTERED candidates).
  const noMatch = await api.request('/recommendations/staples?q=' + encodeURIComponent('zzz-no-such-dish'));
  assert.equal(noMatch.status, 200);
  assert.equal(noMatch.data.total, 0);
  assert.equal(noMatch.data.hasStapleMatch, true);
  assert.deepEqual(noMatch.data.recommendations, []);
  assert.deepEqual({ page: noMatch.data.page, pages: noMatch.data.pages, pageSize: noMatch.data.pageSize }, { page: 1, pages: 1, pageSize: 20 });

  // Zero-result query metadata stays valid even when the page is empty.
  assert.equal(noMatch.data.appliedFilters.q, 'zzz-no-such-dish');
});

test('staple recommendations API: uncomparable units force checkUnits and are never sufficient', async t => {
  const f = fixture(); const api = await listen(createApp(f.db));
  t.after(async () => { await api.close(); f.close(); });
  let s = (await api.request('/onboarding', 'POST', { mode: 'sample', expectedRevision: 0 })).data;
  s = (await api.request('/pantry/tomato', 'PUT', { quantity: 500, unit: 'g', expectedRevision: s.revision })).data;

  // checkUnits entries rank last, so fetch one full page to see tomato-eggs.
  const r = await api.request('/recommendations/staples?pageSize=50');
  const tomatoEggs = r.data.recommendations.find(x => x.recipeId === 'tomato-eggs');
  assert.equal(tomatoEggs.group, 'checkUnits'); // 500 g cannot be compared against a 2-piece need
  const tomato = tomatoEggs.staples.find(x => x.ingredientId === 'tomato');
  assert.equal(tomato.state, 'unitCheck');
  assert.equal(tomato.pantryUnit, 'g');
  assert.equal(tomato.shortfallQuantity, null);
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
  assert.equal(ghost.data.pages, 1);

  await api.request('/onboarding', 'POST', { mode: 'empty', expectedRevision: 0 });
  const empty = await api.request('/recommendations/staples');
  assert.equal(empty.status, 200);
  assert.equal(empty.data.total, 0);
  assert.equal(empty.data.hasStapleMatch, false);

  // Only seasonings in stock: still the "no staple match" empty state - P02
  // prompts for pantry items rather than offering to clear filters.
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
