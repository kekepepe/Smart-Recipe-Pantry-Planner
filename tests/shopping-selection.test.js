import test from 'node:test';
import assert from 'node:assert/strict';
import { createMockClient } from '../web/services/mock-client.js';

test('repeated selection is idempotent, does not consume stock, and tracks pantry edits', async () => {
  const client = createMockClient();
  const initial = await client.resetDemo('sample');
  await client.selectShoppingRecipe('tomato-skillet');
  const selected = await client.selectShoppingRecipe('tomato-skillet');
  assert.deepEqual(selected.pantry, initial.pantry);
  assert.deepEqual(selected.shopping.shortages, [{ ingredientId: 'tomato', quantity: 1, unit: 'piece' }]);
  const updated = await client.savePantryItem({ ingredientId: 'tomato', quantity: 2, unit: 'piece' });
  assert.equal(updated.shopping.status, 'ready');
  assert.deepEqual(updated.shopping.shortages, []);
  assert.equal(updated.pantry.filter(item => item.ingredientId === 'tomato').length, 1);
  const removed = await client.deletePantryItem('tomato');
  assert.equal(removed.shopping.shortages[0].quantity, 2);
});
test('changing a selected recipe to incompatible units invalidates its list', async () => {
  const client = createMockClient();
  await client.resetDemo('sample');
  await client.selectShoppingRecipe('tomato-skillet');
  const updated = await client.savePantryItem({ ingredientId: 'tomato', quantity: 100, unit: 'g' });
  assert.equal(updated.shopping.status, 'checkUnits');
  await assert.rejects(client.selectShoppingRecipe('tomato-skillet'), { code: 'UNIT_MISMATCH' });
});
test('failed saves preserve stock and selection; retry succeeds', async () => {
  const client = createMockClient();
  const initial = await client.resetDemo('sample');
  client.simulateNextSaveFailure();
  await assert.rejects(client.savePantryItem({ ingredientId: 'tomato', quantity: 2, unit: 'piece' }), { code: 'SIMULATED_SAVE_FAILURE' });
  assert.deepEqual((await client.getSnapshot()).pantry, initial.pantry);
  const retry = await client.savePantryItem({ ingredientId: 'tomato', quantity: 2, unit: 'piece' });
  assert.equal(retry.evaluations[1].status, 'ready');
});
test('reset clears selections, supports empty mode, and a new session retains nothing', async () => {
  const client = createMockClient();
  await client.resetDemo('sample');
  await client.selectShoppingRecipe('tomato-skillet');
  const empty = await client.resetDemo('empty');
  assert.deepEqual(empty.pantry, []);
  assert.equal(empty.shoppingRecipeId, null);
  const sample = await client.resetDemo('sample');
  assert.equal(sample.pantry[0].quantity, 2);
  assert.equal(sample.pantry[1].quantity, 1);
  assert.equal((await createMockClient().getSnapshot()).started, false);
});
test('returned snapshots cannot mutate internal data; unknown recipes are rejected', async () => {
  const client = createMockClient();
  const state = await client.resetDemo('sample');
  state.pantry[0].quantity = 100;
  state.recipes[0].requirements[0].quantity = 999;
  const actual = await client.getSnapshot();
  assert.equal(actual.pantry[0].quantity, 2);
  assert.equal(actual.recipes[0].requirements[0].quantity, 2);
  await assert.rejects(client.selectShoppingRecipe('unknown'), { code: 'NOT_FOUND' });
});
