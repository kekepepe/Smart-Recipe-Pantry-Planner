import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatShanghaiDate,
  INSPIRATION_TIMEZONE,
  selectDailyInspiration,
} from '../src/daily-inspiration.js';

const ingredient = (id, name, nameZh = '') => ({ id, name, nameZh });
const recipe = (id, countries, regions, tastes, meals, food, category = 'Example') => ({
  id,
  title: `Dish ${id}`,
  titleZh: `菜谱 ${id}`,
  category,
  countries,
  regions,
  tastes,
  meals,
  requirements: [{ ingredientId: food, quantity: 1, unit: 'piece', role: 'food' }],
});

const fixtureCatalog = {
  catalogVersion: 'v2-test-catalog-1',
  ingredients: [
    ingredient('egg', 'Egg', '鸡蛋'),
    ingredient('tofu', 'Tofu', '豆腐'),
    ingredient('tomato', 'Tomato', '番茄'),
  ],
  recipes: [
    recipe('r1', ['cn'], ['sichuan'], ['spicy', 'savory'], ['dinner'], 'tofu', 'Quick'),
    recipe('r2', ['cn'], ['guangdong'], ['sweet'], ['breakfast'], 'egg', 'Quick'),
    recipe('r3', ['jp'], [], ['savory'], ['breakfast', 'dinner'], 'egg', 'Soup'),
    recipe('r4', ['kr'], [], ['spicy'], ['lunch', 'dinner'], 'tofu', 'Quick'),
    recipe('r5', ['it'], [], ['savory'], ['dinner'], 'tomato', 'Quick'),
    recipe('r6', ['cn'], ['sichuan'], ['spicy'], ['lunch', 'dinner'], 'egg', 'Quick'),
  ],
};

test('daily inspiration: Asia/Shanghai date formatting switches at UTC+8 midnight', () => {
  // 2026-11-25T15:59:59.999Z === 2026-11-25 23:59:59.999 Asia/Shanghai
  assert.equal(formatShanghaiDate(new Date('2026-11-25T15:59:59.999Z')), '2026-11-25');
  // 2026-11-25T16:00:00.000Z === 2026-11-26 00:00:00.000 Asia/Shanghai
  assert.equal(formatShanghaiDate(new Date('2026-11-25T16:00:00.000Z')), '2026-11-26');
  // Month / year boundary in Shanghai while UTC is still Dec 31
  assert.equal(formatShanghaiDate(new Date('2026-12-31T16:00:00.000Z')), '2027-01-01');
  assert.equal(formatShanghaiDate(new Date('2026-12-31T15:59:59.000Z')), '2026-12-31');
  assert.throws(() => formatShanghaiDate('not-a-date'), RangeError);
});

test('daily inspiration: deterministic, distinct, up to 3 picks, independent of input order and filter parameter order', () => {
  const first = selectDailyInspiration(fixtureCatalog, {}, { date: '2026-11-25' });
  const second = selectDailyInspiration(fixtureCatalog, {}, { date: '2026-11-25' });
  assert.equal(first.timezone, INSPIRATION_TIMEZONE);
  assert.equal(first.date, '2026-11-25');
  assert.equal(first.pantryIndependent, true);
  assert.equal(first.count, 3);
  assert.equal(first.totalCandidates, 6);
  assert.equal(new Set(first.recipeIds).size, 3);
  assert.deepEqual(first, second);

  // Reversing the catalog array produces identical recipeIds and order.
  const reversed = selectDailyInspiration(
    { ...fixtureCatalog, recipes: [...fixtureCatalog.recipes].reverse() },
    {},
    { date: '2026-11-25' },
  );
  assert.deepEqual(reversed.recipeIds, first.recipeIds);

  // Filter parameter ordering and case of q do not alter selection.
  const f1 = selectDailyInspiration(
    fixtureCatalog,
    new URLSearchParams('countries=cn&countries=kr&tastes=spicy,savory&meals=dinner'),
    { date: '2026-11-25' },
  );
  const f2 = selectDailyInspiration(
    fixtureCatalog,
    new URLSearchParams('meals=dinner&tastes=savory&tastes=spicy&countries=kr,cn'),
    { date: '2026-11-25' },
  );
  assert.deepEqual(f1.recipeIds, f2.recipeIds);
  assert.deepEqual(f1.appliedFilters, f2.appliedFilters);
});

test('daily inspiration: date rollover, catalogVersion change, and filter change can produce different picks', () => {
  const dates = ['2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29'];
  const byDate = dates.map(date => selectDailyInspiration(fixtureCatalog, {}, { date }).recipeIds.join(','));
  assert(new Set(byDate).size > 1, 'Expected picks to vary across multiple dates');

  const versions = ['v2-test-catalog-1', 'v2-test-catalog-2', 'v2-test-catalog-3', 'v2-test-catalog-4'];
  const byVersion = versions.map(catalogVersion =>
    selectDailyInspiration({ ...fixtureCatalog, catalogVersion }, {}, { date: '2026-11-25' }).recipeIds.join(','),
  );
  assert(new Set(byVersion).size > 1, 'Expected picks to vary when catalogVersion changes');
});

test('daily inspiration: fewer than 3 matches returns actual count; zero matches returns empty without relaxing filters', () => {
  const two = selectDailyInspiration(fixtureCatalog, new URLSearchParams('regions=sichuan'), { date: '2026-11-25' });
  assert.equal(two.totalCandidates, 2);
  assert.equal(two.count, 2);
  assert.deepEqual([...two.recipeIds].sort(), ['r1', 'r6']);

  const zero = selectDailyInspiration(fixtureCatalog, new URLSearchParams('tastes=bitter'), { date: '2026-11-25' });
  assert.equal(zero.totalCandidates, 0);
  assert.equal(zero.count, 0);
  assert.deepEqual(zero.recipeIds, []);
  assert.deepEqual(zero.recipes, []);
});

test('daily inspiration: ignores pantry-dependent availability filter and rejects invalid filters', () => {
  const base = selectDailyInspiration(fixtureCatalog, new URLSearchParams('countries=cn'), { date: '2026-11-25' });
  const withAvail = selectDailyInspiration(
    fixtureCatalog,
    new URLSearchParams('countries=cn&availability=ready'),
    { date: '2026-11-25' },
  );
  assert.deepEqual(withAvail.recipeIds, base.recipeIds);
  assert.equal(withAvail.appliedFilters.availability, 'all');

  for (const bad of ['countries=bogus', 'countries=jp&regions=sichuan', 'category=unknown', 'availability=bad', 'date=2026-11-25', 'unexpected=1']) {
    assert.throws(
      () => selectDailyInspiration(fixtureCatalog, new URLSearchParams(bad), { date: '2026-11-25' }),
      error => error.code === 'INVALID_FILTER',
      bad,
    );
  }
});
