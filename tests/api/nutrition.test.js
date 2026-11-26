import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../server/app.js';
import { Store } from '../../server/services/store.js';
import { fixture, listen } from '../helpers.js';

// Fixture mapping values below are FDC-style entries used only to exercise the computation;
// the production dataset ships with Mao's M02 sources, not with this PR.
const egg = { ingredientId: 'egg', entryName: 'Egg, whole, raw', state: 'raw', kcalPer100g: 143, basisUnit: 'piece', gramsPerPiece: 55, sourceUrl: 'https://fdc.nal.usda.gov/fdc-app.html#/food-details/171287/nutrients', sourceDate: '2026-11-01', verifiedBy: 'ChangPeng' };
const salt = { ingredientId: 'salt', entryName: 'Salt, table', state: 'raw', kcalPer100g: 0, basisUnit: 'g', sourceUrl: 'https://fdc.nal.usda.gov/fdc-app.html#/food-details/173464/nutrients', sourceDate: '2026-11-01', verifiedBy: 'ChangPeng', notes: 'Energy 0 per source; editorial fixed amount.' };

test('nutrition API: without the M02 dataset every dish honestly reports unavailable, never a fabricated number', async t => {
  const f = fixture(); const api = await listen(createApp(f.db, { nutritionMappings: [] }));
  t.after(async () => { await api.close(); f.close(); });
  const r = await api.request('/nutrition');
  assert.equal(r.status, 200);
  assert.equal(r.data.total, 100); // fixed seeded catalog
  assert.equal(r.data.estimatedCount, 0);
  assert.equal(r.data.mappingsLoaded, 0);
  assert(r.data.nutrition.every(item => item.status === 'unavailable' && item.wholeDishKcal === null && item.unmappedRequired.length > 0));
  const steamed = r.data.nutrition.find(item => item.recipeId === 'steamed-eggs');
  assert.deepEqual(steamed.unmappedRequired, ['egg', 'salt']);
  assert.match(steamed.unavailableReason, /egg, salt/);
  assert.equal(typeof r.data.catalogVersion, 'string');
  assert.equal(r.data.pantryRevision, 0); // read-only: pre-onboarding workspace untouched
});

test('nutrition API: default M02 production dataset loads >= 20 verified dishes and leaves unmapped dishes unavailable', async t => {
  const f = fixture(); const api = await listen(createApp(f.db));
  t.after(async () => { await api.close(); f.close(); });

  const r = await api.request('/nutrition');
  assert.equal(r.status, 200);
  assert.equal(r.data.total, 100);
  assert.equal(r.data.mappingsLoaded, 69);
  assert.equal(r.data.estimatedCount, 21);
  assert(r.data.estimatedCount >= 20);
  assert.equal(r.data.pantryRevision, 0); // read-only

  // Hand-calculated spot checks against USDA SR Legacy FDC entries in data/nutrition-mappings.json:
  // scrambled-eggs: 2 large eggs x 50 g x 1.43 kcal/g = 143 kcal (1 serving).
  const scrambled = r.data.nutrition.find(item => item.recipeId === 'scrambled-eggs');
  assert.equal(scrambled.status, 'estimated');
  assert.equal(scrambled.wholeDishKcal, 143);
  assert.equal(scrambled.perServingKcal, 143);

  // steamed-eggs: 2 large eggs (143) + 2 g table salt (sourced 0 kcal) = 143 kcal (1 serving).
  const steamed = r.data.nutrition.find(item => item.recipeId === 'steamed-eggs');
  assert.equal(steamed.status, 'estimated');
  assert.equal(steamed.wholeDishKcal, 143);
  assert(steamed.assumptions.some(a => a.ingredientId === 'salt'));

  // tomato-eggs: 2 tomatoes (2x123x0.18=44.28) + 3 eggs (3x50x1.43=214.5) + 12 ml oil (12x0.92x8.84=97.5936) + 3 g salt (0) = 356.3736 / 2 = 178.1868.
  const tomatoEggs = r.data.nutrition.find(item => item.recipeId === 'tomato-eggs');
  assert.equal(tomatoEggs.status, 'estimated');
  assert.equal(tomatoEggs.wholeDishKcal, 356.3736);
  assert.equal(tomatoEggs.perServingKcal, 178.1868);
  assert.deepEqual(tomatoEggs.display, { wholeDishKcal: 356, perServingKcal: 178 });

  // Detail endpoint returns all 4 verified USDA provenance records on demand.
  const detail = await api.request('/nutrition/tomato-eggs');
  assert.equal(detail.status, 200);
  assert.equal(detail.data.mappings.length, 4);
  assert(detail.data.mappings.every(m => m.sourceUrl.startsWith('https://fdc.nal.usda.gov/food-details/') && m.sourceDate && m.verifiedBy));

  // Withheld oil-bath / bone-in / compound dishes stay honestly unavailable with null energy (never fabricated 0 kcal).
  for (const id of ['stir-fried-noodles', 'tortilla-espanola', 'buffalo-wings', 'fish-and-chips', 'bacalhau-a-bras']) {
    const item = r.data.nutrition.find(entry => entry.recipeId === id);
    assert.equal(item.status, 'unavailable');
    assert.equal(item.wholeDishKcal, null);
    assert.equal(item.perServingKcal, null);
    assert(item.unmappedRequired.length > 0);
  }
});

test('nutrition API: with a fixture dataset the mapped dishes estimate and the rest stay unavailable', async t => {
  const f = fixture(); const api = await listen(createApp(f.db, { nutritionMappings: [egg, salt] }));
  t.after(async () => { await api.close(); f.close(); });
  await api.request('/onboarding', 'POST', { mode: 'sample', expectedRevision: 0 });

  const r = await api.request('/nutrition');
  assert.equal(r.status, 200);
  assert.equal(r.data.mappingsLoaded, 2);
  assert(r.data.estimatedCount >= 1 && r.data.estimatedCount < 100); // partial dataset: honest coverage

  // steamed-eggs: egg 2 piece x 55 g x 1.43 = 157.3 kcal, salt contributes a sourced 0; 1 serving.
  const steamed = r.data.nutrition.find(item => item.recipeId === 'steamed-eggs');
  assert.equal(steamed.status, 'estimated');
  assert.equal(steamed.wholeDishKcal, 157.3);
  assert.equal(steamed.perServingKcal, 157.3);
  assert.deepEqual(steamed.display, { wholeDishKcal: 157, perServingKcal: 157 });
  assert.deepEqual(steamed.assumptions, [{ ingredientId: 'salt', state: 'raw', notes: 'Energy 0 per source; editorial fixed amount.' }]);
  assert.deepEqual(steamed.usedIngredients, ['egg', 'salt']);

  // tomato-eggs still needs tomato and oil mappings: whole dish unavailable, no partial total.
  const tomatoEggs = r.data.nutrition.find(item => item.recipeId === 'tomato-eggs');
  assert.equal(tomatoEggs.status, 'unavailable');
  assert.equal(tomatoEggs.wholeDishKcal, null);
  assert.deepEqual(tomatoEggs.unmappedRequired, ['oil', 'tomato']);
});

test('nutrition API: detail endpoint returns source records on demand and 404 for unknown recipes', async t => {
  const f = fixture(); const api = await listen(createApp(f.db, { nutritionMappings: [egg, salt] }));
  t.after(async () => { await api.close(); f.close(); });
  await api.request('/onboarding', 'POST', { mode: 'sample', expectedRevision: 0 });

  const detail = await api.request('/nutrition/steamed-eggs');
  assert.equal(detail.status, 200);
  assert.equal(detail.data.wholeDishKcal, 157.3);
  assert.equal(detail.data.mappings.length, 2);
  assert.deepEqual(detail.data.mappings.find(m => m.ingredientId === 'egg'), egg); // full provenance echo
  assert.equal(typeof detail.data.catalogVersion, 'string');

  const ghost = await api.request('/nutrition/not-a-recipe');
  assert.equal(ghost.status, 404);
  assert.equal(ghost.data.error.code, 'NOT_FOUND');
});

test('nutrition API: read-only, deterministic and revision-stable', async t => {
  const f = fixture(); const api = await listen(createApp(f.db, { nutritionMappings: [egg, salt] }));
  t.after(async () => { await api.close(); f.close(); });
  let s = (await api.request('/onboarding', 'POST', { mode: 'sample', expectedRevision: 0 })).data;
  const before = new Store(f.db).getSnapshot();
  const revision = s.revision;

  const first = await api.request('/nutrition');
  const second = await api.request('/nutrition');
  assert.equal(first.status, 200);
  assert.deepEqual(first.data, second.data); // same input, byte-identical output
  assert.equal(first.data.pantryRevision, revision); // nutrition never advances the revision

  const after = new Store(f.db).getSnapshot();
  assert.deepEqual(after, before); // no writes anywhere
});

test('nutrition API: an invalid dataset fails fast at startup instead of serving fake numbers', async t => {
  const f = fixture(); t.after(f.close);
  const duplicate = [...Array(2)].map((_, i) => ({ ...egg, entryName: `copy ${i}` }));
  assert.throws(() => createApp(f.db, { nutritionMappings: duplicate }), /duplicate mapping/);
  assert.throws(() => createApp(f.db, { nutritionMappings: [{ ...egg, state: 'fried' }] }), /state must be/);
});
