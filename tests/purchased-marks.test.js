import test from 'node:test';
import assert from 'node:assert/strict';
import { computePurchaseGaps, reconcilePurchasedMarks } from '../src/purchased-marks.js';
import { fixture } from './helpers.js';
import { Store } from '../server/services/store.js';

const mark = (ingredientId, expectedQuantity, unit) => ({ ingredientId, expectedQuantity, unit });
const req = (ingredientId, quantity, unit) => ({ ingredientId, quantity, unit });

test('gaps: gap = max(required - stock, 0), only positive gaps are exposed', () => {
  const { gaps, conflicted } = computePurchaseGaps(
    [req('egg', 3, 'piece'), req('salt', 3, 'g')],
    [req('egg', 2, 'piece')].map(r => ({ ingredientId: r.ingredientId, quantity: r.quantity, unit: r.unit })),
  );
  // egg: 3 - 2 = 1 to buy; salt: no stock, full 3 to buy.
  assert.deepEqual([...gaps.entries()], [['egg|piece', 100], ['salt|g', 300]]);
  assert.equal(conflicted.size, 0);
});

test('gaps: stock covering the need yields no gap row at all', () => {
  const { gaps } = computePurchaseGaps([req('egg', 3, 'piece')], [{ ingredientId: 'egg', quantity: 3, unit: 'piece' }]);
  assert.equal(gaps.size, 0);
  const over = computePurchaseGaps([req('egg', 3, 'piece')], [{ ingredientId: 'egg', quantity: 5, unit: 'piece' }]);
  assert.equal(over.gaps.size, 0);
});

test('gaps: an uncomparable pantry unit produces no gap and flags the ingredient', () => {
  const { gaps, conflicted } = computePurchaseGaps([req('tomato', 2, 'piece')], [{ ingredientId: 'tomato', quantity: 500, unit: 'g' }]);
  assert.equal(gaps.size, 0);
  assert.deepEqual([...conflicted], ['tomato']);
});

test('gaps: recipe-to-recipe unit conflict flags the ingredient even with no pantry row', () => {
  // Two selected recipes demand tomato in different units (Warm tomato skillet:
  // 2 pieces; Ratatouille: 600 g). No pantry row exists, yet no comparable gap can
  // be computed - the same rule as evaluateShopping's combined unitIssues.
  const { gaps, conflicted } = computePurchaseGaps([req('tomato', 2, 'piece'), req('tomato', 600, 'g'), req('salt', 3, 'g')], []);
  assert.deepEqual([...conflicted], ['tomato']);
  assert.deepEqual([...gaps.entries()], [['salt|g', 300]]); // unrelated ingredient keeps its gap
  // The cancelled tomato mark never matches; the unaffected salt mark survives.
  const marks = [mark('tomato', 2, 'piece'), mark('salt', 3, 'g')];
  const { kept, cancelled } = reconcilePurchasedMarks(marks, gaps);
  assert.deepEqual(cancelled, [mark('tomato', 2, 'piece')]);
  assert.deepEqual(kept, [mark('salt', 3, 'g')]);
  // A compatible pantry unit does not cure a recipe-to-recipe conflict.
  const withStock = computePurchaseGaps([req('tomato', 2, 'piece'), req('tomato', 600, 'g')], [{ ingredientId: 'tomato', quantity: 500, unit: 'g' }]);
  assert.deepEqual([...withStock.conflicted], ['tomato']);
  assert.equal(withStock.gaps.size, 0);
});

test('reconcile: a mark survives only while the current positive gap equals its bound amount', () => {
  const marks = [mark('egg', 1, 'piece'), mark('salt', 3, 'g')];
  const gaps = new Map([['egg|piece', 100], ['salt|g', 300]]);
  assert.deepEqual(reconcilePurchasedMarks(marks, gaps).kept, marks);
  // The raw requirement (3) is NOT the authoritative amount any more: a mark
  // bound to the old total-demand semantics no longer matches the gap of 1.
  assert.equal(reconcilePurchasedMarks([mark('egg', 3, 'piece')], gaps).kept.length, 0);
  // Gap moved in either direction -> cancelled.
  assert.equal(reconcilePurchasedMarks(marks, new Map([['egg|piece', 200], ['salt|g', 300]])).kept.length, 1);
  // Gap reached zero (no row) or unit dropped (no row) -> cancelled.
  assert.deepEqual(reconcilePurchasedMarks(marks, new Map([['salt|g', 300]])).cancelled, [mark('egg', 1, 'piece')]);
});

test('reconcile: minor-unit exactness - float-aggregated gaps still match exact marks', () => {
  // A 0.1 g + 0.2 g demand aggregates to 0.30000000000000004 g; the gap math
  // rounds to 30 minor units, so a 0.3 g mark matches exactly.
  const drifted = computePurchaseGaps([req('salt', 0.1 + 0.2, 'g')], []);
  assert.deepEqual([...drifted.gaps.entries()], [['salt|g', 30]]);
  assert.deepEqual(reconcilePurchasedMarks([mark('salt', 0.3, 'g')], drifted.gaps).kept, [mark('salt', 0.3, 'g')]);
  // One hundredth of a gram more never matches.
  assert.equal(reconcilePurchasedMarks([mark('salt', 0.31, 'g')], drifted.gaps).kept.length, 0);
});

test('store: mark binds the to-buy gap (1), not the raw requirement (3)', t => {
  const f = fixture(); t.after(f.close); const store = new Store(f.db);
  let s = store.onboard({ mode: 'sample', expectedRevision: 0 });
  s = store.selectRecipe({ recipeId: 'tomato-eggs', expectedRevision: s.revision });
  // tomato-eggs needs 3 eggs, the sample pantry has 2: the shopping row shows 1 to buy.
  assert.deepEqual(s.shopping.shortages.find(i => i.ingredientId === 'egg'), { ingredientId: 'egg', quantity: 1, unit: 'piece' });
  s = store.markPurchased('egg', { unit: 'piece', expectedQuantity: 1, expectedRevision: s.revision });
  assert.deepEqual(s.purchasedMarks, [{ ingredientId: 'egg', unit: 'piece', expectedQuantity: 1, markedAt: s.purchasedMarks[0].markedAt }]);
  // Marking the raw requirement (3) is rejected: the authoritative amount is the gap.
  assert.throws(() => store.markPurchased('egg', { unit: 'piece', expectedQuantity: 3, expectedRevision: s.revision }), error => error.status === 422 && error.code === 'PURCHASED_MARK_STALE');
  // Marking leaves inventory and the gap untouched.
  assert.deepEqual(s.pantry.find(i => i.ingredientId === 'egg'), { ingredientId: 'egg', quantity: 2, unit: 'piece' });
  assert.deepEqual(s.shopping.shortages.find(i => i.ingredientId === 'egg'), { ingredientId: 'egg', quantity: 1, unit: 'piece' });
});

test('store: filling the gap deletes the mark, and it stays absent when the gap returns', t => {
  const f = fixture(); t.after(f.close); const store = new Store(f.db);
  let s = store.onboard({ mode: 'sample', expectedRevision: 0 });
  s = store.selectRecipe({ recipeId: 'tomato-eggs', expectedRevision: s.revision });
  s = store.markPurchased('egg', { unit: 'piece', expectedQuantity: 1, expectedRevision: s.revision });
  // Fill the gap: pantry egg 2 -> 3. The gap reaches zero and the mark is deleted.
  s = store.saveItem('egg', { quantity: 3, unit: 'piece', expectedRevision: s.revision });
  assert.deepEqual(s.purchasedMarks, []);
  // The gap later returns (3 -> 2): the deleted mark does not revive.
  s = store.saveItem('egg', { quantity: 2, unit: 'piece', expectedRevision: s.revision });
  assert.deepEqual(s.shopping.shortages.find(i => i.ingredientId === 'egg'), { ingredientId: 'egg', quantity: 1, unit: 'piece' });
  assert.deepEqual(s.purchasedMarks, []);
});

test('store: an unrelated pantry update preserves a valid mark', t => {
  const f = fixture(); t.after(f.close); const store = new Store(f.db);
  let s = store.onboard({ mode: 'sample', expectedRevision: 0 });
  s = store.selectRecipe({ recipeId: 'tomato-eggs', expectedRevision: s.revision });
  s = store.markPurchased('egg', { unit: 'piece', expectedQuantity: 1, expectedRevision: s.revision });
  // Topping up tomato changes tomato's gap (1 -> 0, its mark goes) but egg's
  // gap is untouched, so the egg mark survives.
  s = store.saveItem('tomato', { quantity: 5, unit: 'piece', expectedRevision: s.revision });
  assert.deepEqual(s.purchasedMarks.map(m => m.ingredientId), ['egg']);
  assert.deepEqual(s.purchasedMarks.map(m => m.expectedQuantity), [1]);
});

test('store: checkUnits rejects new marks, clears conflicted marks, preserves valid ones', t => {
  const f = fixture(); t.after(f.close); const store = new Store(f.db);
  let s = store.onboard({ mode: 'sample', expectedRevision: 0 });
  s = store.selectRecipe({ recipeId: 'tomato-eggs', expectedRevision: s.revision });
  s = store.markPurchased('tomato', { unit: 'piece', expectedQuantity: 1, expectedRevision: s.revision });
  s = store.markPurchased('egg', { unit: 'piece', expectedQuantity: 1, expectedRevision: s.revision });
  // Switch the pantry tomato to grams: the list flips to checkUnits.
  s = store.saveItem('tomato', { quantity: 500, unit: 'g', expectedRevision: s.revision });
  assert.equal(s.shopping.status, 'checkUnits');
  assert.deepEqual(s.purchasedMarks.map(m => m.ingredientId), ['egg']); // conflicted tomato mark cleared, egg kept
  // A fresh tomato mark is rejected with a documented, prompt-ready error.
  assert.throws(() => store.markPurchased('tomato', { unit: 'piece', expectedQuantity: 2, expectedRevision: s.revision }), error => error.status === 422 && error.code === 'UNIT_CHECK_REQUIRED');
  // Restoring a compatible unit reopens the list, but the tomato mark stays cleared.
  s = store.saveItem('tomato', { quantity: 1, unit: 'piece', expectedRevision: s.revision });
  assert.equal(s.shopping.status, 'needsShopping');
  assert.deepEqual(s.purchasedMarks.map(m => m.ingredientId), ['egg']);
});

test('store: recipe-to-recipe unit conflict clears the mark even with no pantry row; removing the recipe never revives it', t => {
  const f = fixture(); t.after(f.close); const store = new Store(f.db);
  // Empty pantry: Warm tomato skillet needs 2 tomato pieces -> a 2-piece gap.
  let s = store.onboard({ mode: 'empty', expectedRevision: 0 });
  s = store.selectRecipe({ recipeId: 'tomato-skillet', expectedRevision: s.revision });
  assert.deepEqual(s.shopping.shortages, [{ ingredientId: 'tomato', quantity: 2, unit: 'piece' }]);
  s = store.markPurchased('tomato', { unit: 'piece', expectedQuantity: 2, expectedRevision: s.revision });
  assert.deepEqual(s.purchasedMarks.map(m => m.ingredientId), ['tomato']);
  // Ratatouille demands tomatoes in grams: a recipe-to-recipe conflict with NO
  // pantry row. The combined list flips to checkUnits and the tomato mark clears.
  s = store.selectRecipe({ recipeId: 'ratatouille', expectedRevision: s.revision });
  assert.equal(s.shopping.status, 'checkUnits');
  assert.deepEqual(s.shopping.unitIssues.find(i => i.ingredientId === 'tomato'), { ingredientId: 'tomato', requiredUnits: ['piece', 'g'], availableUnit: null });
  assert.deepEqual(s.purchasedMarks, []);
  // New marks are refused while the conflict blocks the list.
  assert.throws(() => store.markPurchased('tomato', { unit: 'piece', expectedQuantity: 2, expectedRevision: s.revision }), error => error.status === 422 && error.code === 'UNIT_CHECK_REQUIRED');
  // Removing Ratatouille restores the original row, but the cancelled mark stays absent.
  s = store.removeRecipe('ratatouille', { expectedRevision: s.revision });
  assert.equal(s.shopping.status, 'needsShopping');
  assert.deepEqual(s.shopping.shortages, [{ ingredientId: 'tomato', quantity: 2, unit: 'piece' }]);
  assert.deepEqual(s.purchasedMarks, []);
});

test('store: requirement change cancels the stale mark and keeps the exact one (C02 coordination)', t => {
  const f = fixture(); t.after(f.close); const store = new Store(f.db);
  let s = store.onboard({ mode: 'sample', expectedRevision: 0 });
  s = store.selectRecipe({ recipeId: 'tomato-eggs', expectedRevision: s.revision });
  s = store.markPurchased('tomato', { unit: 'piece', expectedQuantity: 1, expectedRevision: s.revision });
  s = store.markPurchased('egg', { unit: 'piece', expectedQuantity: 1, expectedRevision: s.revision });
  // Requirement change: steamed-eggs adds 2 more egg pieces -> egg gap 1 -> 3 -> egg mark cancelled.
  s = store.selectRecipe({ recipeId: 'steamed-eggs', expectedRevision: s.revision });
  assert.deepEqual(s.purchasedMarks.map(m => m.ingredientId), ['tomato']);
  assert.equal(s.shopping.requirements.find(i => i.ingredientId === 'egg').quantity, 5);
  assert.deepEqual(s.shopping.shortages.find(i => i.ingredientId === 'egg'), { ingredientId: 'egg', quantity: 3, unit: 'piece' });
});

test('store: requirements dropped to zero - marks cleared, re-selecting never revives them', t => {
  const f = fixture(); t.after(f.close); const store = new Store(f.db);
  let s = store.onboard({ mode: 'sample', expectedRevision: 0 });
  s = store.selectRecipe({ recipeId: 'tomato-eggs', expectedRevision: s.revision });
  s = store.markPurchased('tomato', { unit: 'piece', expectedQuantity: 1, expectedRevision: s.revision });
  s = store.markPurchased('egg', { unit: 'piece', expectedQuantity: 1, expectedRevision: s.revision });
  // Clearing the selection drops every requirement to zero: marks cancelled.
  s = store.clearSelection({ expectedRevision: s.revision });
  assert.deepEqual(s.purchasedMarks, []);
  // The gaps return with the same values, but cancelled marks do not revive.
  s = store.selectRecipe({ recipeId: 'tomato-eggs', expectedRevision: s.revision });
  assert.deepEqual(s.purchasedMarks, []);
  assert.deepEqual(s.shopping.shortages.find(i => i.ingredientId === 'egg'), { ingredientId: 'egg', quantity: 1, unit: 'piece' });
});

test('store: mark validation - unknown ingredient, unsupported unit, no list, conflict paths', t => {
  const f = fixture(); t.after(f.close); const store = new Store(f.db);
  let s = store.onboard({ mode: 'sample', expectedRevision: 0 });
  assert.throws(() => store.markPurchased('ghost', { unit: 'piece', expectedQuantity: 1, expectedRevision: s.revision }), error => error.status === 404);
  // Validator paths throw DomainError like saveItem does; the HTTP layer maps them to 422.
  assert.throws(() => store.markPurchased('milk', { unit: 'piece', expectedQuantity: 1, expectedRevision: s.revision }), /supported unit/);
  assert.throws(() => store.markPurchased('egg', { unit: 'kg', expectedQuantity: 1, expectedRevision: s.revision }), /supported unit/);
  // No active list yet: marking is rejected even for valid catalog ingredients.
  assert.throws(() => store.markPurchased('egg', { unit: 'piece', expectedQuantity: 1, expectedRevision: s.revision }), error => error.status === 422 && error.code === 'NO_ACTIVE_LIST');
  s = store.selectRecipe({ recipeId: 'tomato-eggs', expectedRevision: s.revision });
  // Gap mismatch (the client must send the shopping-row to-buy quantity)...
  assert.throws(() => store.markPurchased('egg', { unit: 'piece', expectedQuantity: 4, expectedRevision: s.revision }), error => error.status === 422 && error.code === 'PURCHASED_MARK_STALE');
  assert.throws(() => store.markPurchased('oil', { unit: 'ml', expectedQuantity: 999, expectedRevision: s.revision }), error => error.status === 422 && error.code === 'PURCHASED_MARK_STALE');
  // ...and nothing left to buy: after stocking salt to the full requirement,
  // its gap reaches zero and marking is refused.
  s = store.saveItem('salt', { quantity: 3, unit: 'g', expectedRevision: s.revision });
  assert.throws(() => store.markPurchased('salt', { unit: 'g', expectedQuantity: 3, expectedRevision: s.revision }), error => error.status === 422 && error.code === 'PURCHASED_MARK_NOT_REQUIRED');
  // A stale revision is still a conflict.
  assert.throws(() => store.markPurchased('egg', { unit: 'piece', expectedQuantity: 1, expectedRevision: s.revision - 1 }), error => error.status === 409);
  // Zero/negative quantities are rejected outright; over-precise quantities by the shared validator.
  assert.throws(() => store.markPurchased('egg', { unit: 'piece', expectedQuantity: 0, expectedRevision: s.revision }), /greater than 0/);
  assert.throws(() => store.markPurchased('egg', { unit: 'g', expectedQuantity: 0.001, expectedRevision: s.revision }), /two decimal places/);
});

test('store: mark, unmark, revision bump and deterministic snapshot ordering', t => {
  const f = fixture(); t.after(f.close); const store = new Store(f.db);
  let s = store.onboard({ mode: 'sample', expectedRevision: 0 });
  s = store.selectRecipe({ recipeId: 'tomato-eggs', expectedRevision: s.revision });
  // Gaps with the sample pantry: egg 1, tomato 1, oil 12, salt 3.
  const revisionBeforeMarks = s.revision;
  s = store.markPurchased('tomato', { unit: 'piece', expectedQuantity: 1, expectedRevision: s.revision });
  s = store.markPurchased('egg', { unit: 'piece', expectedQuantity: 1, expectedRevision: s.revision });
  s = store.markPurchased('salt', { unit: 'g', expectedQuantity: 3, expectedRevision: s.revision });
  s = store.markPurchased('oil', { unit: 'ml', expectedQuantity: 12, expectedRevision: s.revision });
  assert.deepEqual(s.purchasedMarks.map(m => `${m.ingredientId}|${m.unit}`), ['egg|piece', 'oil|ml', 'salt|g', 'tomato|piece']);
  assert.deepEqual(s.purchasedMarks.map(m => m.expectedQuantity), [1, 12, 3, 1]);
  assert.equal(s.revision, revisionBeforeMarks + 4);
  s = store.unmarkPurchased('oil', { unit: 'ml', expectedRevision: s.revision });
  assert.deepEqual(s.purchasedMarks.map(m => `${m.ingredientId}|${m.unit}`), ['egg|piece', 'salt|g', 'tomato|piece']);
  // Idempotent unmark of an absent mark: 200, snapshot unchanged apart from revision.
  const before = s;
  s = store.unmarkPurchased('oil', { unit: 'ml', expectedRevision: s.revision });
  assert.deepEqual(s.purchasedMarks, before.purchasedMarks);
});

test('store: transaction fault during mark rolls back mark and revision', t => {
  const f = fixture(); t.after(f.close);
  const store = new Store(f.db);
  let s = store.onboard({ mode: 'sample', expectedRevision: 0 });
  s = store.selectRecipe({ recipeId: 'tomato-eggs', expectedRevision: s.revision });
  const failed = new Store(f.db, { fault() { throw new Error('WRITE_ABORTED'); } });
  assert.throws(() => failed.markPurchased('egg', { unit: 'piece', expectedQuantity: 1, expectedRevision: s.revision }), /WRITE_ABORTED/);
  const after = store.getSnapshot();
  assert.deepEqual(after.purchasedMarks, []);
  assert.equal(after.revision, s.revision);
  // The same mark succeeds once the fault is cleared.
  s = store.markPurchased('egg', { unit: 'piece', expectedQuantity: 1, expectedRevision: s.revision });
  assert.deepEqual(s.purchasedMarks.map(m => m.ingredientId), ['egg']);
});
