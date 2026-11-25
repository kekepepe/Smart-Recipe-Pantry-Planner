-- 004: independent purchased-mark table (C02 purchased-item service).
-- Contract: docs/PURCHASED-MARKS-CONTRACT.md (H02 persistence requirements).
-- Marks bind (workspace, ingredient, unit) to the expected purchase quantity
-- at marking time and never cascade from rebuilt derived rows: they reference
-- only workspaces and the stable ingredient_units dimension, so rebuilding
-- shopping lists or selections can never silently drop or rewrite a mark.
CREATE TABLE purchased_marks(
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  ingredient_id TEXT NOT NULL,
  unit TEXT NOT NULL,
  expected_quantity_minor INTEGER NOT NULL CHECK(expected_quantity_minor>0 AND expected_quantity_minor<=2000000000 AND typeof(expected_quantity_minor)='integer'),
  marked_at TEXT NOT NULL,
  PRIMARY KEY(workspace_id,ingredient_id,unit),
  FOREIGN KEY(ingredient_id,unit) REFERENCES ingredient_units(ingredient_id,unit),
  CHECK(unit!='piece' OR expected_quantity_minor%100=0)
);
