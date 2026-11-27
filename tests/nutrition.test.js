import test from 'node:test';
import assert from 'node:assert/strict';
import { computeNutrition, validateNutritionMappings, indexNutritionMappings, roundForDisplay } from '../src/nutrition.js';
import { DomainError } from '../src/evaluate-recipe.js';

// Hand-calculated fixtures: every expected number below is worked out by hand against
// docs/NUTRITION-CONTRACT.md (section 5 of the V2 plan). The 600/3=200 fixture is math-test
// data, not a nutrition fact about any dish.

const mapping = over => ({ sourceUrl: 'https://example.test/source', sourceDate: '2026-11-01', verifiedBy: 'ChangPeng', ...over });
const recipe = (id, servings, requirements) => ({ id, title: id, titleZh: null, servings, requirements });
const req = (ingredientId, quantity, unit = 'g') => ({ ingredientId, quantity, unit });
const index = records => indexNutritionMappings(records);

test('C03 rules: the 600 kcal / 3 servings fixture displays exactly 200 kcal per serving', t => {
  // 500 g at 100 kcal/100g = 500, plus 100 g at 100 kcal/100g = 100 -> whole 600; 600/3 = 200.
  const dish = recipe('math-fixture', 3, [req('staple-a', 500), req('staple-b', 100)]);
  const mappings = index([
    mapping({ ingredientId: 'staple-a', entryName: 'Fixture food A', state: 'raw', kcalPer100g: 100, basisUnit: 'g' }),
    mapping({ ingredientId: 'staple-b', entryName: 'Fixture food B', state: 'raw', kcalPer100g: 100, basisUnit: 'g' }),
  ]);
  const result = computeNutrition(dish, mappings);
  assert.equal(result.status, 'estimated');
  assert.equal(result.wholeDishKcal, 600);
  assert.equal(result.perServingKcal, 200);
  assert.deepEqual(result.display, { wholeDishKcal: 600, perServingKcal: 200 });
  assert.equal(result.unavailableReason, null);
  assert.deepEqual(result.unmappedRequired, []);
});

test('C03 rules: ml requirements convert through the sourced density only', t => {
  // 12 ml x 0.91 g/ml = 10.92 g -> 10.92/100 x 884 = 96.5328 kcal.
  const oil = mapping({ ingredientId: 'oil', entryName: 'Oil', state: 'raw', kcalPer100g: 884, basisUnit: 'ml', densityGPerMl: 0.91 });
  const result = computeNutrition(recipe('fried', 1, [req('oil', 12, 'ml')]), index([oil]));
  assert.equal(result.wholeDishKcal, 96.5328);
  assert.equal(result.display.wholeDishKcal, 97); // rounded for display, raw value preserved
  assert.equal(result.perServingKcal, 96.5328);
});

test('C03 rules: piece requirements convert through the sourced per-piece edible weight only', t => {
  // 3 pieces x 55 g/piece = 165 g -> 165/100 x 143 = 235.95 kcal.
  const egg = mapping({ ingredientId: 'egg', entryName: 'Egg, whole, raw', state: 'raw', kcalPer100g: 143, basisUnit: 'piece', gramsPerPiece: 55 });
  const result = computeNutrition(recipe('boiled', 1, [req('egg', 3, 'piece')]), index([egg]));
  assert.equal(result.wholeDishKcal, 235.95);
  assert.equal(result.display.wholeDishKcal, 236);
});

test('C03 rules: mixed units accumulate precisely and per serving divides by basic servings', t => {
  const dish = recipe('mixed-units', 2, [req('staple-a', 500), req('oil', 12, 'ml'), req('egg', 3, 'piece')]);
  const mappings = index([
    mapping({ ingredientId: 'staple-a', entryName: 'Fixture food A', state: 'raw', kcalPer100g: 100, basisUnit: 'g' }),
    mapping({ ingredientId: 'oil', entryName: 'Oil', state: 'raw', kcalPer100g: 884, basisUnit: 'ml', densityGPerMl: 0.91 }),
    mapping({ ingredientId: 'egg', entryName: 'Egg, whole, raw', state: 'raw', kcalPer100g: 143, basisUnit: 'piece', gramsPerPiece: 55 }),
  ]);
  const result = computeNutrition(dish, mappings);
  assert.equal(result.wholeDishKcal, 500 + 96.5328 + 235.95); // 832.4828, full precision kept
  assert.equal(result.perServingKcal, (500 + 96.5328 + 235.95) / 2);
  assert.equal(result.display.wholeDishKcal, 832);
  assert.equal(result.display.perServingKcal, 416);
});

test('C03 rules: one unmapped required ingredient makes the whole dish unavailable, never a partial total', t => {
  const dish = recipe('gap', 2, [req('staple-a', 500), req('ghost-fruit', 100)]);
  const mappings = index([mapping({ ingredientId: 'staple-a', entryName: 'Fixture food A', state: 'raw', kcalPer100g: 100, basisUnit: 'g' })]);
  const result = computeNutrition(dish, mappings);
  assert.equal(result.status, 'unavailable');
  assert.equal(result.wholeDishKcal, null); // not 0, not a partial sum
  assert.equal(result.perServingKcal, null);
  assert.deepEqual(result.unmappedRequired, ['ghost-fruit']);
  assert.match(result.unavailableReason, /ghost-fruit/);
  assert.deepEqual(result.usedIngredients, ['staple-a']); // computed lines are still reported
});

test('C03 rules: a mapping whose unit/conversion does not line up blocks the dish too', t => {
  // ml requirement but the only verified record is per-mass: never guess the conversion.
  const wrongBasis = mapping({ ingredientId: 'oil', entryName: 'Oil', state: 'raw', kcalPer100g: 884, basisUnit: 'g' });
  const result = computeNutrition(recipe('fried', 1, [req('oil', 12, 'ml')]), index([wrongBasis]));
  assert.equal(result.status, 'unavailable');
  assert.deepEqual(result.unmappedRequired, ['oil']);

  // Defense in depth: a hand-built Map bypassing load validation still cannot fabricate a number.
  const broken = new Map([['oil|ml', { ingredientId: 'oil', basisUnit: 'ml', kcalPer100g: 884 }]]); // density missing
  const guarded = computeNutrition(recipe('fried', 1, [req('oil', 12, 'ml')]), broken);
  assert.equal(guarded.status, 'unavailable');
  assert.equal(guarded.wholeDishKcal, null);
});

test('C03 rules: missing or invalid servings make only the per-serving value unavailable', t => {
  const mappings = index([mapping({ ingredientId: 'staple-a', entryName: 'Fixture food A', state: 'raw', kcalPer100g: 100, basisUnit: 'g' })]);
  const zero = computeNutrition(recipe('no-servings', 0, [req('staple-a', 600)]), mappings);
  assert.equal(zero.status, 'estimated');
  assert.equal(zero.wholeDishKcal, 600);
  assert.equal(zero.perServingKcal, null); // unknown servings never become 0 or a fake number
  assert.equal(zero.display.perServingKcal, null);
  const missing = computeNutrition(recipe('no-servings', undefined, [req('staple-a', 600)]), mappings);
  assert.equal(missing.perServingKcal, null);
  assert.equal(missing.wholeDishKcal, 600);
});

test('C03 rules: a sourced zero-energy seasoning contributes 0 and keeps the dish estimable', t => {
  const dish = recipe('salted', 1, [req('staple-a', 600), req('salt', 2)]);
  const mappings = index([
    mapping({ ingredientId: 'staple-a', entryName: 'Fixture food A', state: 'raw', kcalPer100g: 100, basisUnit: 'g' }),
    mapping({ ingredientId: 'salt', entryName: 'Salt, table', state: 'raw', kcalPer100g: 0, basisUnit: 'g', notes: 'Energy 0 per source; editorial fixed amount.' }),
  ]);
  const result = computeNutrition(dish, mappings);
  assert.equal(result.status, 'estimated');
  assert.equal(result.wholeDishKcal, 600);
  // The zero-energy note and any non-raw state surface as explicit assumptions, not silent edits.
  assert.deepEqual(result.assumptions, [{ ingredientId: 'salt', state: 'raw', notes: 'Energy 0 per source; editorial fixed amount.' }]);
});

test('C03 rules: cooked-state assumptions surface next to the estimate', t => {
  const rice = mapping({ ingredientId: 'cooked-rice', entryName: 'Rice, cooked', state: 'cooked', kcalPer100g: 130, basisUnit: 'g', notes: 'Cooked weight; raw rice is a distinct ingredient ID.' });
  const result = computeNutrition(recipe('rice-bowl', 1, [req('cooked-rice', 300)]), index([rice]));
  assert.equal(result.wholeDishKcal, 390);
  assert.deepEqual(result.assumptions, [{ ingredientId: 'cooked-rice', state: 'cooked', notes: 'Cooked weight; raw rice is a distinct ingredient ID.' }]);
});

test('C03 rules: identical inputs produce identical output (deterministic, order-stable)', t => {
  const mappings = index([mapping({ ingredientId: 'staple-a', entryName: 'A', state: 'raw', kcalPer100g: 100, basisUnit: 'g' })]);
  const dish = recipe('same', 2, [req('staple-a', 500), req('staple-a', 100)]); // duplicate line: summed in order
  assert.deepEqual(computeNutrition(dish, mappings), computeNutrition(dish, mappings));
});

test('C03 rules: mapping dataset validation fails fast on every structural defect', t => {
  const good = mapping({ ingredientId: 'a', entryName: 'A', state: 'raw', kcalPer100g: 100, basisUnit: 'g' });
  assert.deepEqual(validateNutritionMappings([good]), [good]);
  const defect = (record, message) => assert.throws(() => validateNutritionMappings([good, record]), e => e instanceof DomainError && e.message.includes(message) && e.code === 'INVALID_DATA', message);
  defect(mapping({ ingredientId: 'a', entryName: 'A', state: 'raw', kcalPer100g: 100, basisUnit: 'g' }), 'duplicate mapping'); // same (id, unit)
  defect(mapping({ ingredientId: 'b', entryName: 'B', state: 'fried', kcalPer100g: 100, basisUnit: 'g' }), 'state must be');
  defect(mapping({ ingredientId: 'b', entryName: 'B', state: 'raw', kcalPer100g: 100, basisUnit: 'kg' }), 'basisUnit must be');
  defect(mapping({ ingredientId: 'b', entryName: 'B', state: 'raw', kcalPer100g: -1, basisUnit: 'g' }), 'kcalPer100g');
  defect(mapping({ ingredientId: 'b', entryName: 'B', state: 'raw', kcalPer100g: 100, basisUnit: 'ml' }), 'densityGPerMl'); // ml without density
  defect(mapping({ ingredientId: 'b', entryName: 'B', state: 'raw', kcalPer100g: 100, basisUnit: 'piece' }), 'gramsPerPiece'); // piece without weight
  defect(mapping({ ingredientId: 'b', entryName: 'B', state: 'raw', kcalPer100g: 100, basisUnit: 'g', densityGPerMl: 1 }), 'must not carry density'); // g with extra conversion
  defect(mapping({ ingredientId: 'b', entryName: 'B', state: 'raw', kcalPer100g: 100, basisUnit: 'g', sourceUrl: '' }), 'sourceUrl');
  defect(mapping({ ingredientId: 'b', entryName: 'B', state: 'raw', kcalPer100g: 100, basisUnit: 'g', sourceDate: '' }), 'sourceDate');
  defect(mapping({ ingredientId: 'b', entryName: 'B', state: 'raw', kcalPer100g: 100, basisUnit: 'g', verifiedBy: '' }), 'verifiedBy');
  assert.throws(() => validateNutritionMappings('nope'), /array/);
  // A sourced zero (salt) is valid; an unknown value is not representable at all.
  assert.doesNotThrow(() => validateNutritionMappings([mapping({ ingredientId: 'salt', entryName: 'Salt', state: 'raw', kcalPer100g: 0, basisUnit: 'g' })]));
});

test('C03 rules: display rounding rounds half up and never mutates the raw values', t => {
  assert.equal(roundForDisplay(96.5328), 97);
  assert.equal(roundForDisplay(200), 200);
  assert.equal(roundForDisplay(199.5), 200);
});

test('C03 rules: optional edibleYield and recipeRetentions adjust energy and surface assumptions', t => {
  const wings = mapping({
    ingredientId: 'wings', entryName: 'Chicken wings', state: 'raw', kcalPer100g: 200, basisUnit: 'g',
    edibleYield: 0.5, notes: '50% edible yield.',
  });
  const oil = mapping({
    ingredientId: 'oil', entryName: 'Vegetable oil', state: 'raw', kcalPer100g: 884, basisUnit: 'ml', densityGPerMl: 0.92,
    recipeRetentions: { 'deep-fry': { factor: 0.1, notes: '10% deep-fry absorption.' } },
  });
  const indexed = index([wings, oil]);
  const fried = computeNutrition(recipe('deep-fry', 2, [req('wings', 1000, 'g'), req('oil', 500, 'ml')]), indexed);
  // wings: 1000/100 * 200 * 0.5 = 1000; oil: 500 * 0.92 / 100 * 884 * 0.1 = 406.64
  assert.equal(fried.wholeDishKcal, 1406.64);
  assert.equal(fried.perServingKcal, 703.32);
  assert(fried.assumptions.some(a => a.ingredientId === 'oil' && a.notes.includes('10% deep-fry absorption.')));

  // Normal recipe without retention override uses 100% of oil.
  const pan = computeNutrition(recipe('pan-fry', 1, [req('oil', 10, 'ml')]), indexed);
  assert.equal(pan.wholeDishKcal, 81.328);

  // Validation rejects out-of-range yield or malformed retention entries.
  assert.throws(() => validateNutritionMappings([mapping({ ingredientId: 'x', entryName: 'X', state: 'raw', kcalPer100g: 100, basisUnit: 'g', edibleYield: 0 })]), /edibleYield/);
  assert.throws(() => validateNutritionMappings([mapping({ ingredientId: 'x', entryName: 'X', state: 'raw', kcalPer100g: 100, basisUnit: 'g', edibleYield: 1.5 })]), /edibleYield/);
  assert.throws(() => validateNutritionMappings([mapping({ ingredientId: 'x', entryName: 'X', state: 'raw', kcalPer100g: 100, basisUnit: 'g', recipeRetentions: { r1: { factor: 0, notes: 'bad' } } })]), /recipeRetentions/);
});
