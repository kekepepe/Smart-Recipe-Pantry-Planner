import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fixture } from '../helpers.js';
import { openDatabase } from '../../server/db/connection.js';
import { migrate, migrations } from '../../server/db/migrate.js';
import { seed } from '../../server/db/seed.js';
import { Store } from '../../server/services/store.js';
import { root } from '../../server/config.js';
import { ingredients,recipes } from '../../data/catalog.js';
import { validateDiscoveryRecipe } from '../../src/discover-recipes.js';

test('schema 002 upgrade and 100-recipe seed preserve all V1 amounts and multi-recipe choices',t=>{
 const f=fixture();t.after(f.close);
 const old=openDatabase(join(f.dir,'v1.sqlite'),{create:true});t.after(()=>old.close());
 old.exec('CREATE TABLE schema_migrations(version INTEGER PRIMARY KEY,checksum TEXT NOT NULL,applied_at TEXT NOT NULL)');
 for(const m of migrations.slice(0,2)){old.exec(m.sql);old.prepare('INSERT INTO schema_migrations VALUES (?,?,?)').run(m.version,m.checksum,'legacy');}
 for(const i of ingredients){old.prepare('INSERT INTO ingredients VALUES (?,?,?)').run(i.id,i.name,i.singular);for(const u of i.allowedUnits)old.prepare('INSERT INTO ingredient_units VALUES (?,?)').run(i.id,u);}
 for(const r of recipes.slice(0,20)){const {requirements,steps,...meta}=r;old.prepare('INSERT INTO recipes VALUES (?,?)').run(r.id,JSON.stringify(meta));requirements.forEach((q,n)=>old.prepare('INSERT INTO recipe_requirements VALUES (?,?,?,?,?)').run(r.id,q.ingredientId,Math.round(q.quantity*100),q.unit,n));steps.forEach((s,n)=>old.prepare('INSERT INTO recipe_steps VALUES (?,?,?)').run(r.id,n,s));}
 old.exec("INSERT INTO pantry_items VALUES ('local','egg',200,'piece'),('local','tomato',100,'piece');INSERT INTO catalog_metadata VALUES (1,'v1-catalog');UPDATE workspaces SET initialized=1,revision=7,pantry_version=3;INSERT INTO shopping_selections VALUES ('local','tomato-skillet',0),('local','tomato-eggs',1);");
 const amounts=old.prepare('SELECT recipe_id,ingredient_id,quantity_minor,unit,position FROM recipe_requirements ORDER BY recipe_id,position').all();
 migrate(old);assert.throws(()=>seed(old),/Catalog changed/);seed(old,{upgrade:true});const s=new Store(old).getSnapshot();
 assert.deepEqual(s.shoppingRecipeIds,['tomato-skillet','tomato-eggs']);assert.equal(s.shopping.shortages.find(i=>i.ingredientId==='tomato').quantity,3);
 assert.deepEqual(s.pantry,[{ingredientId:'egg',quantity:2,unit:'piece'},{ingredientId:'tomato',quantity:1,unit:'piece'}]);assert.equal(s.pantryVersion,3);assert.equal(s.revision,8);
 const preserved=old.prepare('SELECT recipe_id,ingredient_id,quantity_minor,unit,position FROM recipe_requirements WHERE recipe_id IN ('+recipes.slice(0,20).map(()=>'?').join(',')+') ORDER BY recipe_id,position').all(...recipes.slice(0,20).map(r=>r.id));assert.deepEqual(preserved,amounts);
 migrate(old);assert.equal(seed(old),false);assert.deepEqual(new Store(old).getSnapshot(),s);assert.deepEqual(old.pragma('foreign_key_check'),[]);
});
test('catalog: 100 unique titles, required food roles, labels, licensed assets and pinned source snapshots',()=>{
 assert.equal(recipes.length,100);assert.equal(new Set(recipes.map(r=>r.title.toLowerCase())).size,100);
 recipes.forEach(r=>{validateDiscoveryRecipe(r,ingredients);assert(r.steps.length>=3,r.id);assert(existsSync(join(root,'public',r.image)),r.id);});
 const manifest=JSON.parse(readFileSync(join(root,'data/world-image-manifest.json')));assert.equal(manifest.length,80);
 for(const item of manifest){assert(item.credit);assert(item.license);assert.equal(createHash('sha256').update(readFileSync(join(root,item.path))).digest('hex'),item.sha256,item.recipeId);}
 assert.equal(JSON.parse(readFileSync(join(root,'data/sources/unitools/selected-originals.json'))).length,80);
});
