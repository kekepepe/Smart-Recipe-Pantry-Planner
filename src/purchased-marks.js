// Purchased-mark coordination rules (C02). Contract: docs/PURCHASED-MARKS-CONTRACT.md
//
// A purchased mark is bound at marking time to the exact aggregated
// requirement triple (ingredientId, unit, expectedQuantity). The mark
// survives only while the current aggregated requirement keeps that exact
// triple:
//   - same ingredient, same unit, same quantity  -> kept
//   - quantity changed (any direction)           -> cancelled
//   - unit no longer demanded for it             -> cancelled
//   - requirement dropped (including to zero)    -> cancelled; cancelled
//     marks are deleted, so they never revive automatically when the
//     requirement later returns - the user must mark the item again.
// Unrelated requirement changes leave other marks untouched.
// Quantities are compared in integer minor units (quantity * 100) so that
// aggregated floats behave exactly like the shopping-list arithmetic.
export function reconcilePurchasedMarks(marks, requirements) {
  const want = new Map(requirements.map(item => [`${item.ingredientId}|${item.unit}`, Math.round(item.quantity * 100)]));
  const kept = [];
  const cancelled = [];
  for (const mark of marks) {
    const expected = want.get(`${mark.ingredientId}|${mark.unit}`);
    if (expected !== undefined && expected === Math.round(mark.expectedQuantity * 100)) kept.push(mark);
    else cancelled.push(mark);
  }
  return { kept, cancelled };
}
