import { createHash } from 'node:crypto';
import { ingredients, recipes } from '../../data/catalog.js';
import { evaluateRecipe, validateItem } from '../../src/evaluate-recipe.js';
import { Store } from '../services/store.js';
export const catalogVersion = createHash('sha256').update(JSON.stringify({ ingredients, recipes })).digest('hex');
export function seed(db, { upgrade = false } = {}) {
  if (recipes.length > 20 || recipes.length < 3 || new Set(recipes.map(r => r.id)).size !== recipes.length) throw new Error('Catalog must have 3–20 unique recipes.');
  for (const r of recipes) {
    if (!r.steps.length || !r.source || !r.image) throw new Error('Incomplete recipe: ' + r.id);
    r.requirements.forEach(item => validateItem(item, ingredients)); evaluateRecipe(r, [], ingredients);
  }
  return db.transaction(() => {
    const previous = db.prepare('SELECT version FROM catalog_metadata WHERE id=1').get()?.version;
    if (previous === catalogVersion) return false;
    if (previous && !upgrade) throw new Error('Catalog changed. Back up first, then use db:seed -- --upgrade.');
    for (const i of ingredients) {
      db.prepare('INSERT INTO ingredients VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,singular=excluded.singular').run(i.id, i.name, i.singular);
      i.allowedUnits.forEach(u => db.prepare('INSERT OR IGNORE INTO ingredient_units VALUES (?,?)').run(i.id, u));
    }
    for (const r of recipes) {
      const { id, requirements, steps, ...meta } = r;
      db.prepare('INSERT INTO recipes VALUES (?,?) ON CONFLICT(id) DO UPDATE SET metadata=excluded.metadata').run(id, JSON.stringify(meta));
      db.prepare('DELETE FROM recipe_requirements WHERE recipe_id=?').run(id); db.prepare('DELETE FROM recipe_steps WHERE recipe_id=?').run(id);
      requirements.forEach((q, index) => db.prepare('INSERT INTO recipe_requirements VALUES (?,?,?,?,?)').run(id, q.ingredientId, Math.round(q.quantity * 100), q.unit, index));
      steps.forEach((step, index) => db.prepare('INSERT INTO recipe_steps VALUES (?,?,?)').run(id, index, step));
    }
    if (db.prepare('SELECT COUNT(*) AS n FROM recipes').get().n !== recipes.length) throw new Error('Removing catalog recipes needs a dedicated migration.');
    db.prepare('INSERT INTO catalog_metadata VALUES (1,?) ON CONFLICT(id) DO UPDATE SET version=excluded.version').run(catalogVersion);
    for (const w of db.prepare('SELECT id FROM workspaces').all()) {
      new Store(db, { workspace: w.id }).rebuildShopping();
      if (previous) db.prepare('UPDATE workspaces SET revision=revision+1 WHERE id=?').run(w.id);
    }
    return true;
  }).immediate();
}
