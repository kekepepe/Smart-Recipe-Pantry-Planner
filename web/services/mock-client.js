import { DomainError, evaluateRecipe, validateItem } from '../../src/evaluate-recipe.js';
import { ingredients, recipes, samplePantry } from '../data/fixtures.js';

// Intentionally session-only. No localStorage, database or network writes.
export function createMockClient() {
  let pantry = [];
  let shoppingRecipeId = null;
  let started = false;
  let sessionId = 0;
  let failNextSave = false;
  const copy = value => structuredClone(value);

  const snapshot = () => {
    const evaluations = recipes.map(recipe => evaluateRecipe(recipe, pantry, ingredients));
    const selected = evaluations.find(item => item.recipeId === shoppingRecipeId);
    return copy({
      started, sessionId, pantry, ingredients, recipes, evaluations, shoppingRecipeId,
      shopping: selected ?? null,
    });
  };
  const checkFailure = () => {
    if (failNextSave) {
      failNextSave = false;
      throw new DomainError('The demo save failed. Your changes were not saved. Please try again.', '', 'SIMULATED_SAVE_FAILURE');
    }
  };

  return {
    async getSnapshot() { return snapshot(); },
    async savePantryItem(item) {
      const validated = validateItem(item, ingredients);
      checkFailure();
      pantry = [...pantry.filter(entry => entry.ingredientId !== validated.ingredientId), validated];
      started = true;
      return snapshot();
    },
    async deletePantryItem(ingredientId) {
      checkFailure();
      pantry = pantry.filter(entry => entry.ingredientId !== ingredientId);
      return snapshot();
    },
    async selectShoppingRecipe(recipeId) {
      const recipe = recipes.find(entry => entry.id === recipeId);
      if (!recipe) throw new DomainError('This recipe could not be found.', '', 'NOT_FOUND');
      if (evaluateRecipe(recipe, pantry, ingredients).status === 'checkUnits') {
        throw new DomainError('Check ingredient units in your pantry before creating this list.', '', 'UNIT_MISMATCH');
      }
      checkFailure();
      shoppingRecipeId = recipeId;
      return snapshot();
    },
    async resetDemo(mode) {
      if (!['sample', 'empty', 'home'].includes(mode)) throw new DomainError('Unknown reset mode.');
      pantry = mode === 'sample' ? copy(samplePantry) : [];
      shoppingRecipeId = null;
      started = mode !== 'home';
      sessionId += 1;
      return snapshot();
    },
    // Exposed only through the development build's console hook.
    simulateNextSaveFailure() { failNextSave = true; },
  };
}
