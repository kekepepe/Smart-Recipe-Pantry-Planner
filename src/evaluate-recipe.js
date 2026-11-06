import { calculateShortages } from './calculate-shortages.js';

export class DomainError extends Error {
  constructor(message, field = '', code = 'VALIDATION_ERROR') {
    super(message);
    this.name = 'DomainError';
    this.field = field;
    this.code = code;
  }
}

export function validateItem(item, ingredients) {
  const ingredient = ingredients.find(entry => entry.id === item.ingredientId);
  if (!ingredient) throw new DomainError('Choose an ingredient from the list.', 'ingredientId');
  if (!ingredient.allowedUnits.includes(item.unit)) {
    throw new DomainError('Choose a supported unit for this ingredient.', 'unit');
  }
  const quantity = item.quantity;
  if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity < 0 || quantity > 1_000_000) {
    throw new DomainError('Enter a number from 0 to 1,000,000.', 'quantity');
  }
  if (Math.abs(quantity * 100 - Math.round(quantity * 100)) > 0.000001) {
    throw new DomainError('Use no more than two decimal places.', 'quantity');
  }
  if (item.unit === 'piece' && !Number.isInteger(quantity)) {
    throw new DomainError('Use a whole number for pieces.', 'quantity');
  }
  return { ingredientId: ingredient.id, quantity, unit: item.unit };
}

export function evaluateRecipe(recipe, pantry, ingredients) {
  const seen = new Set();
  for (const item of [...recipe.requirements, ...pantry]) validateItem(item, ingredients);
  for (const list of [recipe.requirements, pantry]) {
    seen.clear();
    for (const item of list) {
      if (seen.has(item.ingredientId)) throw new DomainError('Duplicate ingredient data.', '', 'INVALID_DATA');
      seen.add(item.ingredientId);
    }
  }
  const stock = new Map(pantry.map(item => [item.ingredientId, item]));
  const unitIssues = recipe.requirements.flatMap(item => {
    const available = stock.get(item.ingredientId);
    return available && available.unit !== item.unit
      ? [{ ingredientId: item.ingredientId, requiredUnit: item.unit, availableUnit: available.unit }]
      : [];
  });
  const incompatible = new Set(unitIssues.map(item => item.ingredientId));
  const requirements = recipe.requirements.filter(item => !incompatible.has(item.ingredientId));
  const needed = new Set(requirements.map(item => item.ingredientId));
  const toInteger = item => ({ ...item, quantity: Math.round(item.quantity * 100) });
  const shortages = calculateShortages(
    requirements.map(toInteger),
    pantry.filter(item => needed.has(item.ingredientId)).map(toInteger),
  ).map(item => ({ ...item, quantity: item.quantity / 100 }));
  return {
    recipeId: recipe.id,
    status: unitIssues.length ? 'checkUnits' : shortages.length ? 'needsShopping' : 'ready',
    shortages,
    unitIssues,
  };
}
