import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../server/app.js';
import { Store } from '../../server/services/store.js';
import { fixture,listen } from '../helpers.js';

test('discovery API: persistent classifications and filters match actual database catalog without writes',async t=>{
 const f=fixture();const api=await listen(createApp(f.db));t.after(async()=>{await api.close();f.close();});
 const before=new Store(f.db).getSnapshot();
 assert.equal(before.recipes.length,100);assert.equal(before.ingredients.find(i=>i.id==='salt').kind,'seasoning');assert.equal(before.ingredients.find(i=>i.id==='egg').kind,'food');
 assert.equal(before.recipes.find(r=>r.id==='garlic-broccoli').requirements.find(i=>i.ingredientId==='garlic').role,'food');
 for(const q of ['countries=jp','regions=sichuan','tastes=sweet','meals=breakfast','countries=cn&regions=sichuan&tastes=spicy&meals=dinner&q=宫保']){
  const r=await api.request('/recipes?'+encodeURI(q));assert.equal(r.status,200);assert(r.data.total>0,q);
 }
 const one=await api.request('/recipes?countries=cn&regions=sichuan&tastes=spicy&meals=dinner&q='+encodeURIComponent('宫保'));assert.deepEqual(one.data.recipes.map(r=>r.id),['gong-bao-chicken']);
 for(const q of ['countries=jp&regions=sichuan','meals=bad','pageSize=0','unexpected=x'])assert.equal((await api.request('/recipes?'+q)).status,400);
 assert.deepEqual(new Store(f.db).getSnapshot(),before);
});

test('100-recipe API pagination is complete, deterministic and does not duplicate records',async t=>{
 const f=fixture();const api=await listen(createApp(f.db));t.after(async()=>{await api.close();f.close();});let ids=[];
 for(let page=1;page<=5;page++){const r=await api.request('/recipes?page='+page);assert.equal(r.status,200);assert.equal(r.data.total,100);assert.equal(r.data.recipes.length,20);ids.push(...r.data.recipes.map(r=>r.id));}
 assert.equal(new Set(ids).size,100);assert.deepEqual(ids,new Store(f.db).getSnapshot().recipes.map(r=>r.id));
 const empty=await api.request('/recipes?tastes=bitter');assert.equal(empty.status,200);assert.equal(empty.data.total,0);
});
