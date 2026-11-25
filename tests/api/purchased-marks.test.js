import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, listen } from '../helpers.js';
import { createApp } from '../../server/app.js';
import { Store } from '../../server/services/store.js';

const onboardAndSelect = async api => {
  let s = (await api.request('/onboarding', 'POST', { mode: 'sample', expectedRevision: 0 })).data;
  const r = await api.request('/shopping-selection', 'PUT', { recipeId: 'tomato-eggs', expectedRevision: s.revision });
  assert.equal(r.status, 200);
  return r.data; // tomato-eggs: tomato 2, egg 3, oil 12 ml, salt 3 g; sample pantry egg 2, tomato 1 -> gaps: egg 1, tomato 1, oil 12, salt 3.
};

test('purchased marks HTTP: the mark binds the to-buy gap, echoes in the snapshot and unmarks idempotently', async t => {
  const f = fixture(); const api = await listen(createApp(f.db));
  t.after(async () => { await api.close(); f.close(); });
  let s = await onboardAndSelect(api);
  assert.equal(s.schemaVersion, 4);
  assert.deepEqual(s.purchasedMarks, []);

  // The shopping row shows 1 egg to buy (3 required - 2 stocked): sending 1 succeeds.
  const mark = await api.request('/purchased-marks/egg', 'PUT', { unit: 'piece', expectedQuantity: 1, expectedRevision: s.revision });
  assert.equal(mark.status, 200);
  s = mark.data;
  assert.deepEqual(s.purchasedMarks, [{ ingredientId: 'egg', expectedQuantity: 1, unit: 'piece', markedAt: s.purchasedMarks[0].markedAt }]);
  assert.equal(s.revision, s.pantryVersion + 2);
  // Marking the raw requirement (3) is rejected: the gap is the authoritative amount.
  assert.equal((await api.request('/purchased-marks/egg', 'PUT', { unit: 'piece', expectedQuantity: 3, expectedRevision: s.revision })).status, 422);

  // Re-marking with the same bound gap is idempotent.
  s = (await api.request('/purchased-marks/egg', 'PUT', { unit: 'piece', expectedQuantity: 1, expectedRevision: s.revision })).data;
  assert.equal(s.purchasedMarks.length, 1);

  s = (await api.request('/purchased-marks/tomato', 'PUT', { unit: 'piece', expectedQuantity: 1, expectedRevision: s.revision })).data;
  assert.deepEqual(s.purchasedMarks.map(m => m.ingredientId), ['egg', 'tomato']);

  const unmark = await api.request('/purchased-marks/egg', 'DELETE', { unit: 'piece', expectedRevision: s.revision });
  assert.equal(unmark.status, 200);
  s = unmark.data;
  assert.deepEqual(s.purchasedMarks.map(m => m.ingredientId), ['tomato']);

  // Validation and conflict surface over HTTP.
  assert.equal((await api.request('/purchased-marks/ghost', 'PUT', { unit: 'piece', expectedQuantity: 1, expectedRevision: s.revision })).status, 404);
  assert.equal((await api.request('/purchased-marks/egg', 'PUT', { unit: 'kg', expectedQuantity: 1, expectedRevision: s.revision })).status, 422);
  assert.equal((await api.request('/purchased-marks/egg', 'PUT', { unit: 'piece', expectedQuantity: 4, expectedRevision: s.revision })).status, 422);
  assert.equal((await api.request('/purchased-marks/egg', 'PUT', { unit: 'piece', expectedQuantity: 1, expectedRevision: s.revision - 1 })).status, 409);
  assert.equal((await api.request('/purchased-marks/egg', 'PUT', { unit: 'piece', expectedQuantity: 1, expectedRevision: s.revision, extra: 1 })).status, 400);
  // The failed attempts left the state untouched.
  assert.deepEqual((await api.request('/snapshot')).data.purchasedMarks.map(m => m.ingredientId), ['tomato']);

  // Unmarking an absent mark is idempotent and still bumps the revision.
  const before = s;
  s = (await api.request('/purchased-marks/egg', 'DELETE', { unit: 'piece', expectedRevision: s.revision })).data;
  assert.deepEqual(s.purchasedMarks, before.purchasedMarks);
  assert.equal(s.revision, before.revision + 1);
});

test('purchased marks HTTP: filling the gap deletes the mark; it stays absent when the gap returns; unrelated updates preserve valid marks', async t => {
  const f = fixture(); const api = await listen(createApp(f.db));
  t.after(async () => { await api.close(); f.close(); });
  let s = await onboardAndSelect(api);
  s = (await api.request('/purchased-marks/egg', 'PUT', { unit: 'piece', expectedQuantity: 1, expectedRevision: s.revision })).data;
  s = (await api.request('/purchased-marks/salt', 'PUT', { unit: 'g', expectedQuantity: 3, expectedRevision: s.revision })).data;
  assert.deepEqual(s.purchasedMarks.map(m => m.ingredientId), ['egg', 'salt']);

  // Fill the egg gap (pantry 2 -> 3): the egg mark is deleted; salt's gap is untouched, so it survives.
  s = (await api.request('/pantry/egg', 'PUT', { quantity: 3, unit: 'piece', expectedRevision: s.revision })).data;
  assert.deepEqual(s.purchasedMarks.map(m => m.ingredientId), ['salt']);

  // The egg gap later returns (3 -> 2): the deleted mark does not revive.
  s = (await api.request('/pantry/egg', 'PUT', { quantity: 2, unit: 'piece', expectedRevision: s.revision })).data;
  assert.deepEqual(s.shopping.shortages.find(i => i.ingredientId === 'egg'), { ingredientId: 'egg', quantity: 1, unit: 'piece' });
  assert.deepEqual(s.purchasedMarks.map(m => m.ingredientId), ['salt']);

  // An update unrelated to the salt mark (tomato stock) leaves it valid.
  s = (await api.request('/pantry/tomato', 'PUT', { quantity: 5, unit: 'piece', expectedRevision: s.revision })).data;
  assert.deepEqual(s.purchasedMarks.map(m => m.ingredientId), ['salt']);
  assert.deepEqual(s.purchasedMarks.map(m => m.expectedQuantity), [3]);
});

test('purchased marks HTTP: checkUnits rejects new marks, clears conflicted marks and preserves unaffected ones', async t => {
  const f = fixture(); const api = await listen(createApp(f.db));
  t.after(async () => { await api.close(); f.close(); });
  let s = await onboardAndSelect(api);
  s = (await api.request('/purchased-marks/tomato', 'PUT', { unit: 'piece', expectedQuantity: 1, expectedRevision: s.revision })).data;
  s = (await api.request('/purchased-marks/egg', 'PUT', { unit: 'piece', expectedQuantity: 1, expectedRevision: s.revision })).data;

  // Switch the pantry tomato to grams: the list flips to checkUnits, the conflicted
  // tomato mark is cleared and the unaffected egg mark survives.
  s = (await api.request('/pantry/tomato', 'PUT', { quantity: 500, unit: 'g', expectedRevision: s.revision })).data;
  assert.equal(s.shopping.status, 'checkUnits');
  assert.deepEqual(s.purchasedMarks.map(m => m.ingredientId), ['egg']);

  // A fresh tomato mark is rejected with the documented prompt-ready error.
  const rejected = await api.request('/purchased-marks/tomato', 'PUT', { unit: 'piece', expectedQuantity: 2, expectedRevision: s.revision });
  assert.equal(rejected.status, 422);
  assert.equal(rejected.data.error.code, 'UNIT_CHECK_REQUIRED');

  // Restoring a compatible unit reopens the list, but the tomato mark stays cleared.
  s = (await api.request('/pantry/tomato', 'PUT', { quantity: 1, unit: 'piece', expectedRevision: s.revision })).data;
  assert.equal(s.shopping.status, 'needsShopping');
  assert.deepEqual(s.purchasedMarks.map(m => m.ingredientId), ['egg']);
});

test('purchased marks HTTP: requirement change cancels the stale mark; re-marking uses the new gap', async t => {
  const f = fixture(); const api = await listen(createApp(f.db));
  t.after(async () => { await api.close(); f.close(); });
  let s = await onboardAndSelect(api);
  s = (await api.request('/purchased-marks/tomato', 'PUT', { unit: 'piece', expectedQuantity: 1, expectedRevision: s.revision })).data;
  s = (await api.request('/purchased-marks/egg', 'PUT', { unit: 'piece', expectedQuantity: 1, expectedRevision: s.revision })).data;
  assert.deepEqual(s.purchasedMarks.map(m => m.ingredientId), ['egg', 'tomato']);

  // steamed-eggs raises the egg demand from 3 to 5 pieces: egg gap 1 -> 3, egg mark cancelled.
  s = (await api.request('/shopping-selection', 'PUT', { recipeId: 'steamed-eggs', expectedRevision: s.revision })).data;
  assert.deepEqual(s.purchasedMarks.map(m => m.ingredientId), ['tomato']);
  assert.deepEqual(s.shopping.shortages.find(i => i.ingredientId === 'egg'), { ingredientId: 'egg', quantity: 3, unit: 'piece' });

  // Marking with the OLD bound gap is stale; marking the NEW gap succeeds.
  assert.equal((await api.request('/purchased-marks/egg', 'PUT', { unit: 'piece', expectedQuantity: 1, expectedRevision: s.revision })).status, 422);
  s = (await api.request('/purchased-marks/egg', 'PUT', { unit: 'piece', expectedQuantity: 3, expectedRevision: s.revision })).data;
  assert.deepEqual(s.purchasedMarks.map(m => m.ingredientId), ['egg', 'tomato']);
});

test('purchased marks HTTP: clearing the list drops every mark and never revives them', async t => {
  const f = fixture(); const api = await listen(createApp(f.db));
  t.after(async () => { await api.close(); f.close(); });
  let s = await onboardAndSelect(api);
  s = (await api.request('/purchased-marks/tomato', 'PUT', { unit: 'piece', expectedQuantity: 1, expectedRevision: s.revision })).data;
  s = (await api.request('/purchased-marks/egg', 'PUT', { unit: 'piece', expectedQuantity: 1, expectedRevision: s.revision })).data;

  s = (await api.request('/shopping-selection', 'DELETE', { expectedRevision: s.revision })).data;
  assert.equal(s.shopping, null);
  assert.deepEqual(s.purchasedMarks, []);

  s = (await api.request('/shopping-selection', 'PUT', { recipeId: 'tomato-eggs', expectedRevision: s.revision })).data;
  assert.deepEqual(s.shopping.shortages.find(i => i.ingredientId === 'egg'), { ingredientId: 'egg', quantity: 1, unit: 'piece' });
  assert.deepEqual(s.purchasedMarks, []); // cancelled marks do not revive
});

test('purchased marks HTTP: transaction fault rolls the mark back', async t => {
  const f = fixture(); const api = await listen(createApp(f.db));
  t.after(async () => { await api.close(); f.close(); });
  let s = await onboardAndSelect(api);
  const failed = new Store(f.db, { fault() { throw new Error('WRITE_ABORTED'); } });
  assert.throws(() => failed.markPurchased('egg', { unit: 'piece', expectedQuantity: 1, expectedRevision: s.revision }), /WRITE_ABORTED/);
  const after = (await api.request('/snapshot')).data;
  assert.deepEqual(after.purchasedMarks, []);
  assert.equal(after.revision, s.revision);
});
