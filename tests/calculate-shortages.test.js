import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateShortages } from '../src/calculate-shortages.js';
const item = (ingredientId, quantity) => ({ ingredientId, quantity, unit: 'piece' });
test('AC1: need 2 tomatoes, have 1 => shortage 1', () => {
  assert.deepEqual(calculateShortages([item('tomato', 2)], [item('tomato', 1)]), [item('tomato', 1)]);
});
test('AC2: need 2 eggs, have 2 => empty list', () => {
  assert.deepEqual(calculateShortages([item('egg', 2)], [item('egg', 2)]), []);
});
test('AC3: need 2 eggs, have 3 => empty list', () => {
  assert.deepEqual(calculateShortages([item('egg', 2)], [item('egg', 3)]), []);
});
test('AC4: need 2 tomatoes, empty pantry => shortage 2', () => {
  assert.deepEqual(calculateShortages([item('tomato', 2)], []), [item('tomato', 2)]);
});
test('AC5: inputs unchanged; independent outputs in recipe order', () => {
  const requirements = Object.freeze([Object.freeze(item('tomato', 2)), Object.freeze(item('egg', 3))]);
  const pantry = Object.freeze([Object.freeze(item('egg', 1))]);
  const before = structuredClone({ requirements, pantry });
  const actual = calculateShortages(requirements, pantry);
  assert.deepEqual(actual, [item('tomato', 2), item('egg', 2)]);
  actual[0].quantity = 999;
  assert.deepEqual({ requirements, pantry }, before);
});
test('empty requirements and zero quantities do not produce purchases', () => {
  assert.deepEqual(calculateShortages([], [item('egg', 2)]), []);
  assert.deepEqual(calculateShortages([item('egg', 0)], []), []);
});
