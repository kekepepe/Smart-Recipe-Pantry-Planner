import { createHash } from 'node:crypto';
import { taxonomy, validateDiscoveryRecipe } from '../../src/discover-recipes.js';
import { ingredients, recipes } from '../../data/catalog.js';
import { evaluateRecipe, validateItem } from '../../src/evaluate-recipe.js';
import { Store } from '../services/store.js';
export const catalogVersion = createHash('sha256').update(JSON.stringify({ ingredients, recipes, taxonomy })).digest('hex');
export function seed(db, { upgrade = false } = {}) {
  if (recipes.length !== 100 || new Set(recipes.map(r => r.id)).size !== recipes.length) throw new Error('Catalog must have exactly 100 unique recipes.');
  for (const r of recipes) {
    validateDiscoveryRecipe(r, ingredients);
    if (!r.steps.length || !r.source || !r.image) throw new Error('Incomplete recipe: ' + r.id);
    r.requirements.forEach(item => validateItem(item, ingredients)); evaluateRecipe(r, [], ingredients);
  }
  return db.transaction(() => {
    const previous = db.prepare('SELECT version FROM catalog_metadata WHERE id=1').get()?.version;
    if (previous === catalogVersion) return false;
    if (previous && !upgrade) throw new Error('Catalog changed. Back up first, then use db:seed -- --upgrade.');
    for (const i of ingredients) {
      db.prepare('INSERT INTO ingredients(id,name,singular,kind,name_zh) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,singular=excluded.singular,kind=excluded.kind,name_zh=excluded.name_zh').run(i.id, i.name, i.singular, i.kind, i.nameZh || '');
      i.allowedUnits.forEach(u => db.prepare('INSERT OR IGNORE INTO ingredient_units VALUES (?,?)').run(i.id, u));
    }
    for (const [dimension, tags] of Object.entries(taxonomy)) {
      for (const tag of tags) db.prepare('INSERT INTO recipe_tags VALUES (?,?,?,?) ON CONFLICT(dimension,id) DO UPDATE SET label=excluded.label,parent_id=excluded.parent_id').run(dimension, tag.id, tag.label, tag.parent || null);
    }
    for (const r of recipes) {
      const { id, requirements, steps, ...meta } = r;
      db.prepare('INSERT INTO recipes VALUES (?,?) ON CONFLICT(id) DO UPDATE SET metadata=excluded.metadata').run(id, JSON.stringify(meta));
      db.prepare('DELETE FROM recipe_requirements WHERE recipe_id=?').run(id); db.prepare('DELETE FROM recipe_steps WHERE recipe_id=?').run(id);
      requirements.forEach((q, index) => db.prepare('INSERT INTO recipe_requirements(recipe_id,ingredient_id,quantity_minor,unit,position,role) VALUES (?,?,?,?,?,?)').run(id, q.ingredientId, Math.round(q.quantity * 100), q.unit, index, q.role));
      db.prepare('DELETE FROM recipe_tag_links WHERE recipe_id=?').run(id);
      for (const dimension of Object.keys(taxonomy)) for (const tag of r[dimension]) db.prepare('INSERT INTO recipe_tag_links VALUES (?,?,?)').run(id, dimension, tag);
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
