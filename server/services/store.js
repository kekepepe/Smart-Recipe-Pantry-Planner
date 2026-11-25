import { DomainError, validateItem, evaluateRecipe } from '../../src/evaluate-recipe.js';
import { evaluateShopping } from '../../src/evaluate-shopping.js';
import { computePurchaseGaps, reconcilePurchasedMarks } from '../../src/purchased-marks.js';
export class ServiceError extends Error {
  constructor(status, code, message, field = '') { super(message); Object.assign(this, { status, code, field }); }
}
export class Store {
  constructor(db, { workspace = 'local', fault = () => {} } = {}) { this.db = db; this.workspace = workspace; this.fault = fault; }
  catalog() {
    const ingredients = this.db.prepare('SELECT * FROM ingredients ORDER BY rowid').all().map(row => ({ ...row, nameZh: row.name_zh, allowedUnits: this.db.prepare('SELECT unit FROM ingredient_units WHERE ingredient_id=? ORDER BY rowid').all(row.id).map(r => r.unit) }));
    const recipes = this.db.prepare('SELECT * FROM recipes ORDER BY rowid').all().map(row => ({
      id: row.id, ...JSON.parse(row.metadata),
      steps: this.db.prepare('SELECT text FROM recipe_steps WHERE recipe_id=? ORDER BY position').all(row.id).map(r => r.text),
      requirements: this.db.prepare('SELECT ingredient_id AS ingredientId, quantity_minor/100.0 AS quantity, unit, role FROM recipe_requirements WHERE recipe_id=? ORDER BY position').all(row.id),
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
  selectedIds() {
    return this.db.prepare('SELECT recipe_id FROM shopping_selections WHERE workspace_id=? ORDER BY position').all(this.workspace).map(row => row.recipe_id);
  }
  shoppingState(recipes, pantry, ingredients) {
    const ids = this.selectedIds();
    const selected = ids.map(id => recipes.find(recipe => recipe.id === id));
    if (selected.some(recipe => !recipe)) throw new ServiceError(503, 'LIST_OUT_OF_DATE', 'The saved list needs repair.');
    return selected.length ? evaluateShopping(selected, pantry, ingredients) : null;
  }
  purchasedMarks() {
    return this.db.prepare('SELECT ingredient_id AS ingredientId, expected_quantity_minor/100.0 AS expectedQuantity, unit, marked_at AS markedAt FROM purchased_marks WHERE workspace_id=? ORDER BY ingredient_id,unit').all(this.workspace);
  }
  snapshotUnsafe() {
    const state = this.state();
    const { ingredients, recipes, catalogVersion } = this.catalog();
    const pantry = this.pantry();
    const evaluations = recipes.map(recipe => evaluateRecipe(recipe, pantry, ingredients));
    const result = this.shoppingState(recipes, pantry, ingredients);
    const list = this.db.prepare('SELECT * FROM shopping_lists WHERE workspace_id=?').get(this.workspace);
    const stale = () => { throw new ServiceError(503, 'LIST_OUT_OF_DATE', 'The saved list needs repair. Ask the operator to run db:repair.'); };
    if (Boolean(list) !== Boolean(result)) stale();
    if (list) {
      if (list.pantry_version !== state.pantry_version || list.catalog_version !== catalogVersion || list.status !== result.combined.status) stale();
      const saved = this.db.prepare('SELECT ingredient_id AS ingredientId,quantity_minor/100.0 AS quantity,unit FROM shopping_list_items WHERE workspace_id=? ORDER BY position').all(this.workspace);
      if (JSON.stringify(saved) !== JSON.stringify(result.combined.shortages)) stale();
    }
    return {
      schemaVersion: 4, catalogVersion, revision: state.revision, pantryVersion: state.pantry_version,
      initialized: Boolean(state.initialized), started: Boolean(state.initialized), pantry, ingredients, recipes, evaluations,
      shoppingRecipeIds: result?.combined.recipeIds ?? [], shoppingRecipes: result?.perRecipe ?? [], shopping: result?.combined ?? null,
      purchasedMarks: this.purchasedMarks(),
    };
  }
  getSnapshot() { return this.db.transaction(() => this.snapshotUnsafe())(); }
  rebuildShopping() {
    const { ingredients, recipes, catalogVersion } = this.catalog();
    const result = this.shoppingState(recipes, this.pantry(), ingredients);
    // Purchase-gap changes coordinate the marks in the same transaction: marks
    // bound to a changed/zeroed gap, a dropped unit or a unit-conflicted ingredient
    // (pantry mismatch OR recipe-to-recipe unit clash, even with no pantry row)
    // are cancelled here (C02 rules).
    this.reconcilePurchasedMarks(result ? result.combined.requirements : [], this.pantry());
    if (!result) { this.db.prepare('DELETE FROM shopping_lists WHERE workspace_id=?').run(this.workspace); return; }
    const { combined } = result;
    this.db.prepare('INSERT INTO shopping_lists VALUES (?,?,?,?) ON CONFLICT(workspace_id) DO UPDATE SET status=excluded.status,pantry_version=excluded.pantry_version,catalog_version=excluded.catalog_version').run(this.workspace, combined.status, this.state().pantry_version, catalogVersion);
    this.db.prepare('DELETE FROM shopping_list_items WHERE workspace_id=?').run(this.workspace);
    combined.shortages.forEach((item, position) => this.db.prepare('INSERT INTO shopping_list_items VALUES (?,?,?,?,?)').run(this.workspace, item.ingredientId, Math.round(item.quantity * 100), item.unit, position));
  }
  reconcilePurchasedMarks(requirements, pantry) {
    const { gaps, conflicted } = computePurchaseGaps(requirements, pantry);
    const { kept } = reconcilePurchasedMarks(this.purchasedMarks(), gaps);
    const surviving = new Set(kept.map(mark => `${mark.ingredientId}|${mark.unit}`));
    for (const mark of this.purchasedMarks()) {
      if (conflicted.has(mark.ingredientId) || !surviving.has(`${mark.ingredientId}|${mark.unit}`)) {
        this.db.prepare('DELETE FROM purchased_marks WHERE workspace_id=? AND ingredient_id=? AND unit=?').run(this.workspace, mark.ingredientId, mark.unit);
      }
    }
  }
  markPurchased(id, body) {
    const { ingredients } = this.catalog();
    if (!ingredients.some(entry => entry.id === id)) throw new ServiceError(404, 'NOT_FOUND', 'Ingredient not found.', 'ingredientId');
    // A purchased mark must bind a positive quantity; the shared validator alone would accept 0 (valid for pantry amounts).
    if (!(Number(body.expectedQuantity) > 0)) throw new ServiceError(422, 'VALIDATION_ERROR', 'Enter a purchased quantity greater than 0.', 'expectedQuantity');
    // validateItem enforces catalog units, positive quantity bounds and minor-unit exactness.
    const item = validateItem({ ingredientId: id, quantity: body.expectedQuantity, unit: body.unit }, ingredients);
    return this.write(body.expectedRevision, () => {
      const { recipes } = this.catalog();
      const result = this.shoppingState(recipes, this.pantry(), ingredients);
      if (!result) throw new ServiceError(422, 'NO_ACTIVE_LIST', 'Select a recipe before marking purchased items.');
      // While a unit conflict blocks the list there is no trustworthy gap for anyone:
      // the public shortages array is empty, so reject marking instead of guessing.
      if (result.combined.status === 'checkUnits') throw new ServiceError(422, 'UNIT_CHECK_REQUIRED', 'Fix the flagged unit conflicts first (pantry units or recipes demanding different units of the same ingredient); the list cannot compute purchase gaps while units conflict.');
      // The authoritative amount is the current positive purchase gap, not the raw requirement.
      const { gaps } = computePurchaseGaps(result.combined.requirements, this.pantry());
      const gap = gaps.get(`${id}|${item.unit}`);
      if (gap === undefined) throw new ServiceError(422, 'PURCHASED_MARK_NOT_REQUIRED', 'Nothing is left to buy for this ingredient in the current list.');
      if (gap !== Math.round(item.quantity * 100)) throw new ServiceError(422, 'PURCHASED_MARK_STALE', 'The purchase gap changed. Reload the latest shopping rows and mark the to-buy quantity again.');
      this.db.prepare('INSERT INTO purchased_marks(workspace_id,ingredient_id,unit,expected_quantity_minor,marked_at) VALUES (?,?,?,?,?) ON CONFLICT(workspace_id,ingredient_id,unit) DO UPDATE SET expected_quantity_minor=excluded.expected_quantity_minor,marked_at=excluded.marked_at')
        .run(this.workspace, id, item.unit, gap, new Date().toISOString());
    });
  }
  unmarkPurchased(id, body) {
    const { ingredients } = this.catalog();
    if (!ingredients.some(entry => entry.id === id)) throw new ServiceError(404, 'NOT_FOUND', 'Ingredient not found.', 'ingredientId');
    if (!ingredients.find(entry => entry.id === id).allowedUnits.includes(body.unit)) throw new ServiceError(422, 'VALIDATION_ERROR', 'Choose a supported unit for this ingredient.', 'unit');
    return this.write(body.expectedRevision, () => {
      // Idempotent unmark: removing an absent mark leaves the snapshot unchanged.
      this.db.prepare('DELETE FROM purchased_marks WHERE workspace_id=? AND ingredient_id=? AND unit=?').run(this.workspace, id, body.unit);
    });
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
      this.db.prepare('INSERT OR IGNORE INTO shopping_selections(workspace_id,recipe_id,position) SELECT ?,?,COALESCE(MAX(position),-1)+1 FROM shopping_selections WHERE workspace_id=?').run(this.workspace, body.recipeId, this.workspace);
    });
  }
  removeRecipe(id, body) {
    if (!this.catalog().recipes.some(recipe => recipe.id === id)) throw new ServiceError(404, 'NOT_FOUND', 'Recipe not found.');
    return this.write(body.expectedRevision, () => this.db.prepare('DELETE FROM shopping_selections WHERE workspace_id=? AND recipe_id=?').run(this.workspace, id));
  }
  clearSelection(body) {
    return this.write(body.expectedRevision, () => this.db.prepare('DELETE FROM shopping_selections WHERE workspace_id=?').run(this.workspace));
  }
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
