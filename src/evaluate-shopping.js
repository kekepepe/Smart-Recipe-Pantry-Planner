import { evaluateRecipe } from './evaluate-recipe.js';

// Combine requirements first, then subtract the shared pantry once.
// Individual recipe gaps are informational and must never be summed.
export function evaluateShopping(recipes, pantry, ingredients) {
  const perRecipe = recipes.map(recipe => {
    const result = evaluateRecipe(recipe, pantry, ingredients);
    return result.status === 'checkUnits' ? { ...result, shortages: [] } : result;
  });
  const totals = new Map();
  for (const recipe of recipes) {
    for (const item of recipe.requirements) {
      let total = totals.get(item.ingredientId);
      if (!total) { total = new Map(); totals.set(item.ingredientId, total); }
      total.set(item.unit, (total.get(item.unit) || 0) + Math.round(item.quantity * 100));
    }
  }
  const stock = new Map(pantry.map(item => [item.ingredientId, item]));
  const requirements = [];
  const shortages = [];
  const unitIssues = [];
  for (const [ingredientId, units] of totals) {
    const available = stock.get(ingredientId);
    const incompatible = units.size > 1 || (available && !units.has(available.unit));
    if (incompatible) unitIssues.push({ ingredientId, requiredUnits: [...units.keys()], availableUnit: available?.unit ?? null });
    for (const [unit, minor] of units) {
      requirements.push({ ingredientId, quantity: minor / 100, unit });
      if (incompatible) continue;
      const gap = Math.max(minor - Math.round((available?.quantity || 0) * 100), 0);
      if (gap) shortages.push({ ingredientId, quantity: gap / 100, unit });
    }
  }
  return {
    perRecipe,
    combined: {
      recipeIds: recipes.map(recipe => recipe.id), requirements,
      status: unitIssues.length ? 'checkUnits' : shortages.length ? 'needsShopping' : 'ready',
      shortages: unitIssues.length ? [] : shortages, unitIssues,
    },
  };
}
