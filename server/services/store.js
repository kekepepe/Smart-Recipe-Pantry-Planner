import { DomainError, validateItem, evaluateRecipe } from '../../src/evaluate-recipe.js';
export class ServiceError extends Error {
  constructor(status, code, message, field = '') { super(message); Object.assign(this, { status, code, field }); }
}
export class Store {
  constructor(db, { workspace = 'local', fault = () => {} } = {}) { this.db = db; this.workspace = workspace; this.fault = fault; }
  catalog() {
    const ingredients = this.db.prepare('SELECT * FROM ingredients ORDER BY rowid').all().map(row => ({ ...row, allowedUnits: this.db.prepare('SELECT unit FROM ingredient_units WHERE ingredient_id=? ORDER BY rowid').all(row.id).map(r => r.unit) }));
    const recipes = this.db.prepare('SELECT * FROM recipes ORDER BY rowid').all().map(row => ({
      id: row.id, ...JSON.parse(row.metadata),
      steps: this.db.prepare('SELECT text FROM recipe_steps WHERE recipe_id=? ORDER BY position').all(row.id).map(r => r.text),
      requirements: this.db.prepare('SELECT ingredient_id AS ingredientId, quantity_minor/100.0 AS quantity, unit FROM recipe_requirements WHERE recipe_id=? ORDER BY position').all(row.id),
    }));
    const catalogVersion = this.db.prepare('SELECT version FROM catalog_metadata WHERE id=1').get()?.version;
    if (!catalogVersion || !recipes.length) throw new ServiceError(503, 'CATALOG_NOT_READY', 'Recipe catalog is not initialized. Run db:seed.');
    return { ingredients, recipes, catalogVersion };
  }
  pantry() { return this.db.prepare('SELECT ingredient_id AS ingredientId, quantity_minor/100.0 AS quantity,unit FROM pantry_items WHERE workspace_id=? ORDER BY rowid').all(this.workspace); }
  state() {
    const state = this.db.prepare('SELECT * FROM workspaces WHERE id=?').get(this.workspace);
    if (!state) throw new ServiceError(404, 'NOT_FOUND', 'Workspace not found.');
    return state;
  }
  snapshotUnsafe() {
    const state = this.state(); const { ingredients, recipes, catalogVersion } = this.catalog(); const pantry = this.pantry();
    const evaluations = recipes.map(recipe => evaluateRecipe(recipe, pantry, ingredients));
    const list = this.db.prepare('SELECT * FROM shopping_lists WHERE workspace_id=?').get(this.workspace);
    if (list && (list.pantry_version !== state.pantry_version || list.catalog_version !== catalogVersion)) throw new ServiceError(503, 'LIST_OUT_OF_DATE', 'The saved list needs repair. Ask the operator to run db:repair.');
    const shopping = list ? evaluations.find(r => r.recipeId === list.recipe_id) : null;
    if (list) {
      const saved = this.db.prepare('SELECT ingredient_id AS ingredientId,quantity_minor/100.0 AS quantity,unit FROM shopping_list_items WHERE workspace_id=? ORDER BY position').all(this.workspace);
      if (!shopping || list.status !== shopping.status || JSON.stringify(saved) !== JSON.stringify(shopping.status === 'checkUnits' ? [] : shopping.shortages)) throw new ServiceError(503, 'LIST_OUT_OF_DATE', 'The saved list needs repair. Ask the operator to run db:repair.');
    }
    return { schemaVersion: 1, catalogVersion, revision: state.revision, pantryVersion: state.pantry_version, initialized: Boolean(state.initialized), started: Boolean(state.initialized), pantry, ingredients, recipes, evaluations, shoppingRecipeId: list?.recipe_id ?? null, shopping: shopping?.status === 'checkUnits' ? { ...shopping, shortages: [] } : shopping };
  }
  getSnapshot() { return this.db.transaction(() => this.snapshotUnsafe())(); }
  rebuildShopping(recipeId = null) {
    const current = this.db.prepare('SELECT recipe_id FROM shopping_lists WHERE workspace_id=?').get(this.workspace);
    const selected = recipeId ?? current?.recipe_id;
    if (!selected) return;
    const { ingredients, recipes, catalogVersion } = this.catalog(); const recipe = recipes.find(r => r.id === selected);
    if (!recipe) throw new ServiceError(404, 'NOT_FOUND', 'Recipe not found.');
    const evaluation = evaluateRecipe(recipe, this.pantry(), ingredients);
    this.db.prepare('INSERT INTO shopping_lists VALUES (?,?,?,?,?) ON CONFLICT(workspace_id) DO UPDATE SET recipe_id=excluded.recipe_id,status=excluded.status,pantry_version=excluded.pantry_version,catalog_version=excluded.catalog_version').run(this.workspace, selected, evaluation.status, this.state().pantry_version, catalogVersion);
    this.db.prepare('DELETE FROM shopping_list_items WHERE workspace_id=?').run(this.workspace);
    if (evaluation.status !== 'checkUnits') evaluation.shortages.forEach((r, i) => this.db.prepare('INSERT INTO shopping_list_items VALUES (?,?,?,?,?)').run(this.workspace, r.ingredientId, Math.round(r.quantity * 100), r.unit, i));
  }
  write(revision, action, { pantry = false } = {}) {
    if (!Number.isSafeInteger(revision) || revision < 0) throw new ServiceError(400, 'INVALID_REQUEST', 'A valid expectedRevision is required.', 'expectedRevision');
    return this.db.transaction(() => {
      if (this.state().revision !== revision) throw new ServiceError(409, 'REVISION_CONFLICT', 'Your pantry changed in another tab. Reload the latest data, check your draft and save again.');
      action();
      this.db.prepare('UPDATE workspaces SET initialized=1, revision=revision+1, pantry_version=pantry_version+? WHERE id=?').run(pantry ? 1 : 0, this.workspace);
      this.fault('afterPantryWrite');
      this.rebuildShopping();
      return this.snapshotUnsafe();
    }).immediate();
  }
  saveItem(id, body) {
    const { ingredients } = this.catalog();
    if (!ingredients.some(r => r.id === id)) throw new ServiceError(404, 'NOT_FOUND', 'Ingredient not found.', 'ingredientId');
    const item = validateItem({ ingredientId: id, quantity: body.quantity, unit: body.unit }, ingredients);
    return this.write(body.expectedRevision, () => this.db.prepare('INSERT INTO pantry_items VALUES (?,?,?,?) ON CONFLICT(workspace_id,ingredient_id) DO UPDATE SET quantity_minor=excluded.quantity_minor,unit=excluded.unit').run(this.workspace, id, Math.round(item.quantity * 100), item.unit), { pantry: true });
  }
  deleteItem(id, body) {
    if (!this.catalog().ingredients.some(r => r.id === id)) throw new ServiceError(404, 'NOT_FOUND', 'Ingredient not found.');
    return this.write(body.expectedRevision, () => this.db.prepare('DELETE FROM pantry_items WHERE workspace_id=? AND ingredient_id=?').run(this.workspace, id), { pantry: true });
  }
  selectRecipe(body) {
    return this.write(body.expectedRevision, () => {
      const { recipes, ingredients } = this.catalog(); const recipe = recipes.find(r => r.id === body.recipeId);
      if (!recipe) throw new ServiceError(404, 'NOT_FOUND', 'Recipe not found.');
      if (evaluateRecipe(recipe, this.pantry(), ingredients).status === 'checkUnits') throw new ServiceError(422, 'UNIT_MISMATCH', 'Check pantry units before creating this list.');
      this.rebuildShopping(body.recipeId);
    });
  }
  clearSelection(body) { return this.write(body.expectedRevision, () => this.db.prepare('DELETE FROM shopping_lists WHERE workspace_id=?').run(this.workspace)); }
  onboard(body) {
    if (!['sample', 'empty'].includes(body.mode)) throw new ServiceError(400, 'INVALID_REQUEST', 'Choose sample or empty mode.', 'mode');
    return this.write(body.expectedRevision, () => {
      if (this.state().initialized) throw new ServiceError(409, 'ALREADY_INITIALIZED', 'Your saved pantry already exists. Continue with it instead.');
      if (body.mode === 'sample') {
        const put = this.db.prepare('INSERT INTO pantry_items VALUES (?,?,?,?)');
        put.run(this.workspace, 'egg', 200, 'piece'); put.run(this.workspace, 'tomato', 100, 'piece');
      }
    }, { pantry: true });
  }
}
export function publicError(error) {
  if (error instanceof ServiceError) return error;
  if (error instanceof DomainError) return new ServiceError(422, error.code, error.message, error.field);
  if (String(error.code).startsWith('SQLITE_')) return new ServiceError(503, 'STORAGE_UNAVAILABLE', 'Storage is temporarily unavailable. Your save result could not be confirmed. Please reload and retry.');
  if (error.type === 'entity.parse.failed') return new ServiceError(400, 'INVALID_JSON', 'Send valid JSON.');
  if (error.type === 'entity.too.large') return new ServiceError(413, 'REQUEST_TOO_LARGE', 'Request is too large.');
  return new ServiceError(500, 'INTERNAL_ERROR', 'The request could not be completed. Please reload and try again.');
}
