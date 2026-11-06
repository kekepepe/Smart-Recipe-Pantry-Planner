/**
 * Input: arrays of { ingredientId, quantity, unit }.
 * Contract: unique IDs per array, same units, finite non-negative quantities.
 * Return missing items only, in recipe order and the same object shape.
 * Absent stock = 0. Omit zero shortages. Do not mutate either input.
 */
export function calculateShortages(requirements, pantry) {
  const stock = new Map(pantry.map(item => [item.ingredientId, item.quantity]));
  return requirements.flatMap(item => {
    const quantity = Math.max(item.quantity - (stock.get(item.ingredientId) ?? 0), 0);
    return quantity > 0 ? [{ ...item, quantity }] : [];
  });
}
