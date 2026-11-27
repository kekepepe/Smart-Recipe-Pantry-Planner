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
  assert.equal(dataset.length, 306);

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
    assert.match(record.verifiedBy, /@(Justmao1|kekepepe)/);
  }
});

test('M02 dataset: covers all 100 catalog recipes with realistic kcal bounds and zero fabricated 0 kcal estimates', () => {
  const indexed = indexNutritionMappings(dataset);
  const summaries = recipes.map(recipe => computeNutrition(recipe, indexed));
  const estimated = summaries.filter(s => s.status === 'estimated');
  const unavailable = summaries.filter(s => s.status === 'unavailable');

  assert.equal(summaries.length, 100);
  assert.equal(estimated.length, 100);
  assert.equal(unavailable.length, 0);

  for (const s of estimated) {
    assert(Number.isFinite(s.wholeDishKcal) && s.wholeDishKcal > 0, `${s.recipeId} wholeDishKcal must be positive`);
    assert(Number.isFinite(s.perServingKcal) && s.perServingKcal >= 15 && s.perServingKcal <= 2000, `${s.recipeId} perServingKcal (${s.perServingKcal}) out of realistic bounds`);
    assert.deepEqual(s.unmappedRequired, []);
    assert.equal(s.unavailableReason, null);
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
