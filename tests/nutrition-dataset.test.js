import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { recipes, ingredients } from '../data/catalog.js';
import { validateNutritionMappings, indexNutritionMappings, computeNutrition } from '../src/nutrition.js';
import { root } from '../server/config.js';

const dataset = JSON.parse(readFileSync(join(root, 'data', 'nutrition-mappings.json'), 'utf8'));

test('M02 dataset: passes strict C03 schema validation with valid catalog units and USDA provenance', () => {
  validateNutritionMappings(dataset);
  assert.equal(dataset.length, 69);

  const ingredientMap = new Map(ingredients.map(i => [i.id, i]));
  for (const record of dataset) {
    const ing = ingredientMap.get(record.ingredientId);
    assert(ing, `Mapped ingredientId "${record.ingredientId}" must exist in catalog`);
    assert(
      ing.allowedUnits.includes(record.basisUnit),
      `basisUnit "${record.basisUnit}" must be allowed for "${record.ingredientId}"`,
    );
    assert.match(record.sourceUrl, /^https:\/\/fdc\.nal\.usda\.gov\/food-details\/\d+\/nutrients$/);
    assert.match(record.sourceDate, /^\d{4}-\d{2}-\d{2}$/);
    assert(record.verifiedBy.includes('Justmao1'));
  }
});

test('M02 dataset: covers >= 20 complete catalog recipes with zero fabricated 0 kcal estimates', () => {
  const indexed = indexNutritionMappings(dataset);
  const summaries = recipes.map(recipe => computeNutrition(recipe, indexed));
  const estimated = summaries.filter(s => s.status === 'estimated');
  const unavailable = summaries.filter(s => s.status === 'unavailable');

  assert.equal(summaries.length, 100);
  assert.equal(estimated.length, 21);
  assert.equal(unavailable.length, 79);
  assert(estimated.length >= 20);

  for (const s of estimated) {
    assert(Number.isFinite(s.wholeDishKcal) && s.wholeDishKcal > 0, `${s.recipeId} wholeDishKcal must be positive`);
    assert(Number.isFinite(s.perServingKcal) && s.perServingKcal > 0, `${s.recipeId} perServingKcal must be positive`);
    assert.deepEqual(s.unmappedRequired, []);
    assert.equal(s.unavailableReason, null);
  }
  for (const s of unavailable) {
    assert.equal(s.wholeDishKcal, null);
    assert.equal(s.perServingKcal, null);
    assert.deepEqual(s.display, { wholeDishKcal: null, perServingKcal: null });
    assert(s.unmappedRequired.length > 0);
    assert(typeof s.unavailableReason === 'string' && s.unavailableReason.length > 0);
  }

  // Every mapping in data/nutrition-mappings.json must actively contribute to at least one estimated recipe.
  const usedInEstimated = new Set();
  for (const recipe of recipes) {
    const summary = computeNutrition(recipe, indexed);
    if (summary.status !== 'estimated') continue;
    for (const req of recipe.requirements) usedInEstimated.add(`${req.ingredientId}|${req.unit}`);
  }
  const unused = dataset
    .map(r => `${r.ingredientId}|${r.basisUnit}`)
    .filter(k => !usedInEstimated.has(k));
  assert.deepEqual(unused, [], `Unused mappings found: ${unused.join(', ')}`);
});
