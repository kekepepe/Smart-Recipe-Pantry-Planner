import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateRecipe, validateItem } from '../src/evaluate-recipe.js';
import { ingredients, recipes, samplePantry } from '../web/data/fixtures.js';

test('sample pantry separates ready and insufficient recipes; changes re-evaluate', () => {
  assert.equal(evaluateRecipe(recipes[0], samplePantry, ingredients).status, 'ready');
  assert.deepEqual(evaluateRecipe(recipes[1], samplePantry, ingredients).shortages, [{ ingredientId: 'tomato', quantity: 1, unit: 'piece' }]);
  assert.equal(evaluateRecipe(recipes[1], [{ ingredientId: 'tomato', quantity: 2, unit: 'piece' }], ingredients).status, 'ready');
});
test('incompatible units are never ready, even for zero stock', () => {
  for (const quantity of [0, 200]) {
    const result = evaluateRecipe(recipes[1], [{ ingredientId: 'tomato', quantity, unit: 'g' }], ingredients);
    assert.equal(result.status, 'checkUnits');
    assert.equal(result.unitIssues.length, 1);
  }
});
test('absent stock is zero; unrelated inventory units do not affect a recipe', () => {
  assert.deepEqual(evaluateRecipe(recipes[1], [], ingredients).shortages, [{ ingredientId: 'tomato', quantity: 2, unit: 'piece' }]);
  assert.equal(evaluateRecipe(recipes[0], [...samplePantry, { ingredientId: 'rice', quantity: 300, unit: 'g' }], ingredients).status, 'ready');
});
test('decimal comparisons avoid floating point residuals', () => {
  const recipe = { id: 'decimal', requirements: [{ ingredientId: 'rice', quantity: 0.3, unit: 'g' }] };
  assert.deepEqual(evaluateRecipe(recipe, [{ ingredientId: 'rice', quantity: 0.1, unit: 'g' }], ingredients).shortages, [{ ingredientId: 'rice', quantity: 0.2, unit: 'g' }]);
  assert.equal(evaluateRecipe(recipe, [{ ingredientId: 'rice', quantity: 0.3, unit: 'g' }], ingredients).status, 'ready');
});
test('invalid IDs, units, quantities and duplicate data cannot enter matching', () => {
  for (const quantity of [-1, NaN, Infinity, '', 0.001, 1_000_001]) {
    assert.throws(() => validateItem({ ingredientId: 'rice', quantity, unit: 'g' }, ingredients));
  }
  assert.throws(() => validateItem({ ingredientId: 'egg', quantity: 1.5, unit: 'piece' }, ingredients));
  assert.throws(() => validateItem({ ingredientId: 'fake', quantity: 1, unit: 'piece' }, ingredients));
  assert.throws(() => validateItem({ ingredientId: 'rice', quantity: 1, unit: 'piece' }, ingredients));
  assert.throws(() => evaluateRecipe(recipes[0], [samplePantry[0], samplePantry[0]], ingredients));
});
