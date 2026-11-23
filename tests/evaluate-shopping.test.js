import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateShopping } from '../src/evaluate-shopping.js';
const ingredients = [{ id: 'tomato', name: 'Tomatoes', allowedUnits: ['piece', 'g'] }, { id: 'salt', name: 'Salt', allowedUnits: ['g'] }];
const item = (ingredientId, quantity, unit) => ({ ingredientId, quantity, unit });
const recipe = (id, requirements) => ({ id, requirements });

test('multi-recipe: two demands of 2 minus one shared tomato means buy 3, not 2', () => {
  const recipes = [recipe('a', [item('tomato', 2, 'piece')]), recipe('b', [item('tomato', 2, 'piece')])];
  const pantry = [item('tomato', 1, 'piece')]; const before = structuredClone({ recipes, pantry });
  const result = evaluateShopping(recipes, pantry, ingredients);
  assert.deepEqual(result.perRecipe.map(r => r.shortages[0].quantity), [1, 1]);
  assert.deepEqual(result.combined.shortages, [item('tomato', 3, 'piece')]);
  assert.deepEqual(result.combined.requirements, [item('tomato', 4, 'piece')]);
  assert.deepEqual({ recipes, pantry }, before);
});

test('multi-recipe: individually ready dishes can still need shared ingredients together', () => {
  const result = evaluateShopping([recipe('a', [item('tomato', 2, 'piece')]), recipe('b', [item('tomato', 2, 'piece')])], [item('tomato', 2, 'piece')], ingredients);
  assert(result.perRecipe.every(r => r.status === 'ready'));
  assert.equal(result.combined.status, 'needsShopping'); assert.equal(result.combined.shortages[0].quantity, 2);
});

test('multi-recipe: decimal totals, absent stock, surplus and unrelated stock remain exact', () => {
  const result = evaluateShopping([recipe('a', [item('salt', 0.1, 'g'), item('tomato', 2, 'piece')]), recipe('b', [item('salt', 0.2, 'g')])], [item('salt', 0.2, 'g'), item('tomato', 3, 'piece')], ingredients);
  assert.deepEqual(result.combined.shortages, [item('salt', 0.1, 'g')]);
  assert.deepEqual(evaluateShopping([], [], ingredients).combined.shortages, []);
});

test('multi-recipe: incompatible demand units or pantry units suppress incomplete buying totals', () => {
  const recipes = [recipe('a', [item('tomato', 2, 'piece')]), recipe('b', [item('tomato', 200, 'g')])];
  const result = evaluateShopping(recipes, [], ingredients);
  assert.equal(result.combined.status, 'checkUnits'); assert.deepEqual(result.combined.shortages, []);
  assert.deepEqual(result.combined.unitIssues[0].requiredUnits, ['piece', 'g']);
  const stockMismatch = evaluateShopping([recipes[0]], [item('tomato', 10, 'g')], ingredients);
  assert.equal(stockMismatch.combined.status, 'checkUnits'); assert.deepEqual(stockMismatch.perRecipe[0].shortages, []);
});
