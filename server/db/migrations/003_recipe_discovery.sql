ALTER TABLE ingredients ADD COLUMN kind TEXT NOT NULL DEFAULT 'food' CHECK(kind IN ('food','seasoning'));
ALTER TABLE ingredients ADD COLUMN name_zh TEXT NOT NULL DEFAULT '';
ALTER TABLE recipe_requirements ADD COLUMN role TEXT NOT NULL DEFAULT 'food' CHECK(role IN ('food','seasoning'));
UPDATE ingredients SET kind='seasoning' WHERE id IN ('butter','mayonnaise','garlic','dried-chili','ginger','fresh-chili','chili-garlic-sauce','sichuan-pepper','scallion','garlic-sauce','oil','salt','sugar','soy-sauce','dark-soy-sauce','oyster-sauce','vinegar','sesame-oil','cooking-wine','black-pepper','stock-powder','star-anise','bay-leaf');
UPDATE recipe_requirements SET role=(SELECT kind FROM ingredients WHERE id=ingredient_id);
CREATE TABLE recipe_tags(dimension TEXT NOT NULL CHECK(dimension IN ('countries','regions','tastes','meals')), id TEXT NOT NULL, label TEXT NOT NULL, parent_id TEXT, PRIMARY KEY(dimension,id));
CREATE TABLE recipe_tag_links(recipe_id TEXT NOT NULL REFERENCES recipes(id), dimension TEXT NOT NULL, tag_id TEXT NOT NULL, PRIMARY KEY(recipe_id,dimension,tag_id), FOREIGN KEY(dimension,tag_id) REFERENCES recipe_tags(dimension,id));
CREATE INDEX recipe_tags_lookup ON recipe_tag_links(dimension,tag_id,recipe_id);
