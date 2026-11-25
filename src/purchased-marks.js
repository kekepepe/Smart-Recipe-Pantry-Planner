// Purchased-mark coordination rules (C02). Contract: docs/PURCHASED-MARKS-CONTRACT.md
//
// A purchased mark is bound at marking time to the exact current purchase gap:
// max(aggregated required quantity - pantry stock, 0) for that (ingredientId, unit),
// in integer minor units. The mark survives only while the current positive gap
// keeps that exact value:
//   - same ingredient, same unit, same gap          -> kept
//   - the gap changed in any direction              -> cancelled (the bound amount no
//     longer matches what the user still needs to buy)
//   - the unit is no longer demanded for it         -> cancelled
//   - the gap reached zero (stock covers the need)  -> cancelled
// Cancelled marks are deleted, so they never revive automatically when a gap later
// returns - the user must mark the item again. Unrelated changes that leave a mark's
// gap untouched leave the mark alone. Unit-conflicted ingredients have no gap at all,
// so their marks are cancelled: either the pantry unit cannot be compared to the
// demanded unit, or two selected recipes demand different units of the same
// ingredient (a recipe-to-recipe conflict, even with no pantry row).
// Quantities are compared in integer minor units (quantity * 100) so the gap math
// behaves exactly like the shopping-list arithmetic.

// Compute the current positive purchase gaps for an aggregated requirement list.
// `requirements` holds combined rows [{ingredientId, quantity, unit}]; `pantry` holds
// [{ingredientId, quantity, unit}]. Returns { gaps, conflicted }:
//   - gaps: Map `${ingredientId}|${unit}` -> positive gap in minor units (only > 0)
//   - conflicted: Set of unit-conflicted ingredientIds - no gap exists for them and
//     their marks must be cleared. Conflicts mirror evaluateShopping's combined
//     unitIssues rule exactly: several required units for one ingredient
//     (recipe-to-recipe), or a pantry unit outside the required units.
// This is the single server-side gap calculation shared by the PUT check and the
// reconciliation pass.
export function computePurchaseGaps(requirements, pantry) {
  const stock = new Map(pantry.map(item => [item.ingredientId, item]));
  const unitsByIngredient = new Map();
  for (const item of requirements) {
    let units = unitsByIngredient.get(item.ingredientId);
    if (!units) { units = new Set(); unitsByIngredient.set(item.ingredientId, units); }
    units.add(item.unit);
  }
  const gaps = new Map();
  const conflicted = new Set();
  for (const [ingredientId, units] of unitsByIngredient) {
    const available = stock.get(ingredientId);
    if (units.size > 1 || (available && !units.has(available.unit))) {
      conflicted.add(ingredientId); // unit conflict: no comparable gap exists for this ingredient
      continue;
    }
  }
  for (const item of requirements) {
    if (conflicted.has(item.ingredientId)) continue;
    const available = stock.get(item.ingredientId);
    const gap = Math.max(Math.round(item.quantity * 100) - Math.round((available?.quantity || 0) * 100), 0);
    if (gap > 0) gaps.set(`${item.ingredientId}|${item.unit}`, gap);
  }
  return { gaps, conflicted };
}

// Keep a mark only while the current positive purchase gap exactly equals the bound
// minor quantity. Everything else is cancelled (and physically deleted by the store,
// so nothing revives when a gap later returns).
export function reconcilePurchasedMarks(marks, gaps) {
  const kept = [];
  const cancelled = [];
  for (const mark of marks) {
    const gap = gaps.get(`${mark.ingredientId}|${mark.unit}`);
    if (gap !== undefined && gap === Math.round(mark.expectedQuantity * 100)) kept.push(mark);
    else cancelled.push(mark);
  }
  return { kept, cancelled };
}
