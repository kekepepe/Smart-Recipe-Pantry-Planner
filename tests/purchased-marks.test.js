import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcilePurchasedMarks } from '../src/purchased-marks.js';
import { fixture } from './helpers.js';
import { Store } from '../server/services/store.js';

const mark = (ingredientId, expectedQuantity, unit) => ({ ingredientId, expectedQuantity, unit });
const req = (ingredientId, quantity, unit) => ({ ingredientId, quantity, unit });

test('reconcile: exact (ingredient, unit, quantity) match keeps the mark', () => {
  const { kept, cancelled } = reconcilePurchasedMarks([mark('egg', 3, 'piece')], [req('egg', 3, 'piece')]);
  assert.deepEqual(kept, [mark('egg', 3, 'piece')]);
  assert.equal(cancelled.length, 0);
});

test('reconcile: quantity change in either direction cancels the mark', () => {
  const up = reconcilePurchasedMarks([mark('egg', 3, 'piece')], [req('egg', 5, 'piece')]);
  const down = reconcilePurchasedMarks([mark('egg', 3, 'piece')], [req('egg', 1, 'piece')]);
  assert.equal(up.kept.length, 0); assert.deepEqual(up.cancelled, [mark('egg', 3, 'piece')]);
  assert.equal(down.kept.length, 0);
});

test('reconcile: unit no longer demanded cancels the mark', () => {
  const { kept, cancelled } = reconcilePurchasedMarks([mark('salt', 3, 'g')], [req('salt', 3, 'ml')]);
  assert.equal(kept.length, 0); assert.equal(cancelled.length, 1);
});

test('reconcile: requirement dropped to zero cancels and never revives', () => {
  const dropped = reconcilePurchasedMarks([mark('egg', 3, 'piece')], []);
  assert.equal(dropped.kept.length, 0);
  // Even when the same requirement later returns, the cancelled mark is gone
  // from the store, so reconciliation has nothing to keep: re-mark by hand.
  const afterReturn = reconcilePurchasedMarks([], [req('egg', 3, 'piece')]);
  assert.equal(afterReturn.kept.length, 0);
});

test('reconcile: unrelated requirement changes keep other marks untouched', () => {
  const marks = [mark('egg', 3, 'piece'), mark('salt', 3, 'g'), mark('oil', 12, 'ml')];
  const requirements = [req('egg', 3, 'piece'), req('salt', 3, 'g'), req('oil', 12, 'ml'), req('ham', 80, 'g')];
  const { kept, cancelled } = reconcilePurchasedMarks(marks, requirements);
  assert.deepEqual(kept, marks); assert.equal(cancelled.length, 0);
});

test('reconcile: minor-unit exactness - float-aggregated requirements still match exact marks', () => {
  // The store aggregates requirements in integer minor units, so a 0.1 g +
  // 0.2 g demand arrives as a single 0.30000000000000004 g entry; a 0.3 g
  // mark must match it exactly (both round to 30 minor units).
  const driftedRequirement = [req('salt', 0.1 + 0.2, 'g')];
  assert.ok(driftedRequirement[0].quantity !== 0.3);
  assert.deepEqual(reconcilePurchasedMarks([mark('salt', 0.3, 'g')], driftedRequirement).kept, [mark('salt', 0.3, 'g')]);
  // A genuinely different quantity (one hundredth of a gram more) never matches.
  assert.equal(reconcilePurchasedMarks([mark('salt', 0.31, 'g')], [req('salt', 0.3, 'g')]).kept.length, 0);
});

test('reconcile: fractional gram quantities compare in minor units', () => {
  const { kept, cancelled } = reconcilePurchasedMarks([mark('egg', 2, 'piece')], [req('egg', 2.0, 'piece')]);
  assert.deepEqual(kept, [mark('egg', 2, 'piece')]);
  assert.deepEqual(reconcilePurchasedMarks([mark('spinach', 30.5, 'g')], [req('spinach', 30.5, 'g')]).kept, [mark('spinach', 30.5, 'g')]);
  assert.equal(cancelled.length, 0);
});

test('store: mark, unmark, revision bump and deterministic snapshot ordering', t => {
  const f = fixture(); t.after(f.close); const store = new Store(f.db);
  let s = store.onboard({ mode: 'sample', expectedRevision: 0 });
  s = store.selectRecipe({ recipeId: 'tomato-eggs', expectedRevision: s.revision });
  // tomato-eggs: tomato 2 piece, egg 3 piece, oil 12 ml, salt 3 g.
  const tomatoReq = s.shopping.requirements.find(i => i.ingredientId === 'tomato');
  assert.deepEqual(tomatoReq, { ingredientId: 'tomato', quantity: 2, unit: 'piece' });
  s = store.markPurchased('tomato', { unit: 'piece', expectedQuantity: 2, expectedRevision: s.revision });
  s = store.markPurchased('egg', { unit: 'piece', expectedQuantity: 3, expectedRevision: s.revision });
  const revisionBeforeMarks = s.revision;
  s = store.markPurchased('salt', { unit: 'g', expectedQuantity: 3, expectedRevision: s.revision });
  s = store.markPurchased('oil', { unit: 'ml', expectedQuantity: 12, expectedRevision: s.revision });
  assert.deepEqual(s.purchasedMarks.map(m => `${m.ingredientId}|${m.unit}`), ['egg|piece', 'oil|ml', 'salt|g', 'tomato|piece']);
  assert.deepEqual(s.purchasedMarks.map(m => m.expectedQuantity), [3, 12, 3, 2]);
  const revisionAfterMarks = s.revision;
  assert.equal(revisionAfterMarks, revisionBeforeMarks + 2);
  s = store.unmarkPurchased('oil', { unit: 'ml', expectedRevision: s.revision });
  assert.deepEqual(s.purchasedMarks.map(m => `${m.ingredientId}|${m.unit}`), ['egg|piece', 'salt|g', 'tomato|piece']);
  // Idempotent unmark of an absent mark: 200, snapshot unchanged apart from revision.
  const before = s;
  s = store.unmarkPurchased('oil', { unit: 'ml', expectedRevision: s.revision });
  assert.deepEqual(s.purchasedMarks, before.purchasedMarks);
});

test('store: requirement change cancels the stale mark and keeps the exact one (C02 coordination)', t => {
  const f = fixture(); t.after(f.close); const store = new Store(f.db);
  let s = store.onboard({ mode: 'sample', expectedRevision: 0 });
  s = store.selectRecipe({ recipeId: 'tomato-eggs', expectedRevision: s.revision });
  s = store.markPurchased('tomato', { unit: 'piece', expectedQuantity: 2, expectedRevision: s.revision });
  s = store.markPurchased('egg', { unit: 'piece', expectedQuantity: 3, expectedRevision: s.revision });
  // Unrelated change: topping up tomato stock keeps both marks (quantities unchanged).
  s = store.saveItem('tomato', { quantity: 5, unit: 'piece', expectedRevision: s.revision });
  assert.deepEqual(s.purchasedMarks.map(m => m.ingredientId).sort(), ['egg', 'tomato']);
  // Requirement change: steamed-eggs adds 2 more egg pieces -> egg total 5 != 3 -> egg mark cancelled.
  s = store.selectRecipe({ recipeId: 'steamed-eggs', expectedRevision: s.revision });
  assert.deepEqual(s.purchasedMarks.map(m => m.ingredientId), ['tomato']);
  assert.equal(s.shopping.requirements.find(i => i.ingredientId === 'egg').quantity, 5);
});

test('store: requirement dropped to zero - marks cleared, re-selecting never revives them', t => {
  const f = fixture(); t.after(f.close); const store = new Store(f.db);
  let s = store.onboard({ mode: 'sample', expectedRevision: 0 });
  s = store.selectRecipe({ recipeId: 'tomato-eggs', expectedRevision: s.revision });
  s = store.markPurchased('tomato', { unit: 'piece', expectedQuantity: 2, expectedRevision: s.revision });
  s = store.markPurchased('egg', { unit: 'piece', expectedQuantity: 3, expectedRevision: s.revision });
  // Clearing the selection drops every requirement to zero: marks cancelled.
  s = store.clearSelection({ expectedRevision: s.revision });
  assert.deepEqual(s.purchasedMarks, []);
  // The requirement returns with the same triple, but cancelled marks do not revive.
  s = store.selectRecipe({ recipeId: 'tomato-eggs', expectedRevision: s.revision });
  assert.deepEqual(s.purchasedMarks, []);
  assert.deepEqual(s.shopping.requirements.find(i => i.ingredientId === 'egg'), { ingredientId: 'egg', quantity: 3, unit: 'piece' });
});

test('store: mark validation - unknown ingredient, unsupported unit, wrong quantity, no list', t => {
  const f = fixture(); t.after(f.close); const store = new Store(f.db);
  let s = store.onboard({ mode: 'sample', expectedRevision: 0 });
  assert.throws(() => store.markPurchased('ghost', { unit: 'piece', expectedQuantity: 1, expectedRevision: s.revision }), error => error.status === 404);
  // Validator paths throw DomainError like saveItem does; the HTTP layer maps them to 422.
  assert.throws(() => store.markPurchased('milk', { unit: 'piece', expectedQuantity: 1, expectedRevision: s.revision }), /supported unit/);
  assert.throws(() => store.markPurchased('egg', { unit: 'kg', expectedQuantity: 1, expectedRevision: s.revision }), /supported unit/);
  // No active list yet: marking is rejected even for valid catalog ingredients.
  assert.throws(() => store.markPurchased('egg', { unit: 'piece', expectedQuantity: 3, expectedRevision: s.revision }), error => error.status === 422 && error.code === 'NO_ACTIVE_LIST');
  s = store.selectRecipe({ recipeId: 'tomato-eggs', expectedRevision: s.revision });
  assert.throws(() => store.markPurchased('egg', { unit: 'piece', expectedQuantity: 4, expectedRevision: s.revision }), error => error.status === 422 && error.code === 'PURCHASED_MARK_STALE');
  assert.throws(() => store.markPurchased('oil', { unit: 'ml', expectedQuantity: 999, expectedRevision: s.revision }), error => error.status === 422 && error.code === 'PURCHASED_MARK_STALE');
  assert.throws(() => store.markPurchased('egg', { unit: 'piece', expectedQuantity: 3, expectedRevision: s.revision - 1 }), error => error.status === 409);
  // Zero/negative quantities are rejected outright; over-precise quantities by the shared validator.
  assert.throws(() => store.markPurchased('egg', { unit: 'piece', expectedQuantity: 0, expectedRevision: s.revision }), /greater than 0/);
  assert.throws(() => store.markPurchased('egg', { unit: 'g', expectedQuantity: 0.001, expectedRevision: s.revision }), /two decimal places/);
});

test('store: transaction fault during mark rolls back mark and revision', t => {
  const f = fixture(); t.after(f.close);
  const store = new Store(f.db);
  let s = store.onboard({ mode: 'sample', expectedRevision: 0 });
  s = store.selectRecipe({ recipeId: 'tomato-eggs', expectedRevision: s.revision });
  const failed = new Store(f.db, { fault() { throw new Error('WRITE_ABORTED'); } });
  assert.throws(() => failed.markPurchased('egg', { unit: 'piece', expectedQuantity: 3, expectedRevision: s.revision }), /WRITE_ABORTED/);
  const after = store.getSnapshot();
  assert.deepEqual(after.purchasedMarks, []);
  assert.equal(after.revision, s.revision);
  // The same mark succeeds once the fault is cleared.
  s = store.markPurchased('egg', { unit: 'piece', expectedQuantity: 3, expectedRevision: s.revision });
  assert.deepEqual(s.purchasedMarks.map(m => m.ingredientId), ['egg']);
});
