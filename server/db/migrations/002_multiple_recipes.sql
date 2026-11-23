-- Preserve the old recipe choice and cached quantities while removing the
-- single-recipe foreign key from the list header.
ALTER TABLE shopping_lists RENAME TO legacy_shopping_lists;
CREATE TABLE shopping_lists(workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id), status TEXT NOT NULL CHECK(status IN ('ready','needsShopping','checkUnits')), pantry_version INTEGER NOT NULL, catalog_version TEXT NOT NULL);
INSERT INTO shopping_lists SELECT workspace_id,status,pantry_version,catalog_version FROM legacy_shopping_lists;
CREATE TABLE shopping_selections(workspace_id TEXT NOT NULL REFERENCES workspaces(id), recipe_id TEXT NOT NULL REFERENCES recipes(id), position INTEGER NOT NULL CHECK(position>=0), PRIMARY KEY(workspace_id,recipe_id), UNIQUE(workspace_id,position));
INSERT INTO shopping_selections SELECT workspace_id,recipe_id,0 FROM legacy_shopping_lists;
CREATE TABLE shopping_list_items_v2(workspace_id TEXT NOT NULL REFERENCES shopping_lists(workspace_id) ON DELETE CASCADE, ingredient_id TEXT NOT NULL, quantity_minor INTEGER NOT NULL CHECK(quantity_minor>0 AND quantity_minor<=2000000000 AND typeof(quantity_minor)='integer'), unit TEXT NOT NULL, position INTEGER NOT NULL, PRIMARY KEY(workspace_id,ingredient_id), FOREIGN KEY(ingredient_id,unit) REFERENCES ingredient_units(ingredient_id,unit), CHECK(unit!='piece' OR quantity_minor%100=0));
INSERT INTO shopping_list_items_v2 SELECT * FROM shopping_list_items;
DROP TABLE shopping_list_items;
DROP TABLE legacy_shopping_lists;
ALTER TABLE shopping_list_items_v2 RENAME TO shopping_list_items;
UPDATE workspaces SET revision=revision+1 WHERE initialized=1;
