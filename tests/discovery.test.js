import test from 'node:test';
import assert from 'node:assert/strict';
import { discoverRecipes, parseRecipeFilters } from '../src/discover-recipes.js';
const ingredient = (id,name,nameZh='') => ({id,name,nameZh});
const recipe = (id,countries,regions,tastes,meals,food) => ({id,title:id,titleZh:'',category:'Example',countries,regions,tastes,meals,requirements:[{ingredientId:food}]});
const snapshot = {
  ingredients:[ingredient('egg','Egg','鸡蛋'),ingredient('tofu','Tofu','豆腐')],
  recipes:[recipe('a',['cn'],['sichuan'],['spicy','savory'],['dinner'],'tofu'),recipe('b',['jp'],[],['savory'],['breakfast','dinner'],'egg'),recipe('c',['cn'],['guangdong'],['sweet'],['breakfast'],'egg')],
  evaluations:[{recipeId:'a',status:'needsShopping'},{recipeId:'b',status:'ready'},{recipeId:'c',status:'checkUnits'}],
};
const ids = query => discoverRecipes(snapshot,new URLSearchParams(query)).recipes.map(r=>r.id);
test('discovery: every dimension works alone, including a region without country',()=>{
 assert.deepEqual(ids('countries=jp'),['b']); assert.deepEqual(ids('regions=sichuan'),['a']);
 assert.deepEqual(ids('tastes=sweet'),['c']); assert.deepEqual(ids('meals=breakfast'),['b','c']);
 assert.deepEqual(ids('q=豆腐'),['a']); assert.deepEqual(ids('availability=ready'),['b']);
});
test('discovery: OR within dimensions, AND across all dimensions, order independent',()=>{
 const q='countries=jp&countries=cn&tastes=spicy,savory&meals=dinner&q=tofu&regions=sichuan&availability=needsShopping&category=Example';
 assert.deepEqual(ids(q),['a']);assert.deepEqual(ids(q.split('&').reverse().join('&')),['a']);
 assert.deepEqual(ids('countries=cn&tastes=sweet,spicy&meals=breakfast'),['c']);
});
test('discovery: empty results never silently relax conditions; page is clamped',()=>{
 assert.deepEqual(ids('countries=jp&tastes=spicy'),[]);
 const r=discoverRecipes(snapshot,new URLSearchParams('pageSize=2&page=999'));assert.equal(r.page,2);assert.equal(r.total,3);assert.deepEqual(r.recipes.map(r=>r.id),['c']);
});
test('discovery: invalid filters, conflicts and query injection are rejected',()=>{
 for(const q of ['countries=bogus','regions=sichuan&countries=jp','tastes=sql','meals=snack','availability=oops','page=-1','page=1.2','page=','pageSize=1000','q=a&q=b','workspace=other'])assert.throws(()=>parseRecipeFilters(new URLSearchParams(q)),e=>e.code==='INVALID_FILTER',q);
 assert.deepEqual(ids('q=%27%20OR%201%3D1'),[]);
});
test('discovery: all pages cover each record exactly once in a stable order',()=>{
 const all=[1,2,3].flatMap(page=>discoverRecipes(snapshot,{page:String(page),pageSize:'1'}).recipes.map(r=>r.id));assert.deepEqual(all,['a','b','c']);
 assert.deepEqual(ids('q=  EGG  '),['b','c']);
});
