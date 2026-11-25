import { test as base, expect } from '@playwright/test';
import { createApp } from '../../server/app.js';
import { fixture, listen } from '../helpers.js';
const test=base.extend({
 database:async({},use)=>{const f=fixture();try{await use(f);}finally{f.close();}},
 service:async({database},use)=>{const s=await listen(createApp(database.db,{serveStatic:true}));try{await use(s);}finally{await s.close();}},
});
for(const [name,viewport] of [['desktop',{width:1440,height:1000}],['mobile',{width:375,height:812}]]){
 test(`discovery ${name}: single filters, all dimensions, retained query, zero results and clear`,async({page,service},info)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.setViewportSize(viewport);await page.goto(service.url+'/#/recipes');
  await expect(page).toHaveTitle(/Pantry & Plate/);await expect(page.getByRole('article')).toHaveCount(20);await expect(page.getByText('100 of 100 recipes',{exact:false})).toBeVisible();
  await page.getByRole('checkbox',{name:'Japan',exact:true}).check();await expect(page.getByRole('article')).toHaveCount(7);
  await page.getByRole('button',{name:'Clear filters',exact:true}).click();
  await page.getByRole('checkbox',{name:'Sichuan',exact:true}).check();await expect(page.getByRole('article')).toHaveCount(2);
  await page.getByRole('checkbox',{name:'China',exact:true}).check();await page.getByRole('checkbox',{name:'Spicy',exact:true}).check();await page.getByRole('checkbox',{name:'Dinner',exact:true}).check();await page.getByLabel('Find a recipe').fill('宫保');
  await expect(page.getByRole('article')).toHaveCount(1);await expect(page.getByRole('article')).toContainText('Gong bao chicken');
  await page.screenshot({path:info.outputPath(`discovery-${name}.png`),fullPage:true});
  await page.getByRole('link',{name:'View recipe: Gong bao chicken',exact:true}).click();await expect(page.getByRole('heading',{name:'Gong bao chicken',exact:true})).toBeVisible();await expect(page.locator('.ingredient-kind').first()).toBeVisible();
  await page.getByRole('button',{name:'Add missing ingredients to list',exact:true}).click();await expect(page.getByRole('region',{name:'Selected recipes',exact:true})).toContainText('Gong bao chicken');
  await page.getByRole('link',{name:'Add more recipes',exact:true}).click();await expect(page.getByLabel('Find a recipe')).toHaveValue('宫保');await page.reload();await expect(page.getByRole('article')).toHaveCount(1);await expect(page.getByRole('checkbox',{name:'Spicy',exact:true})).toBeChecked();
  await page.getByRole('button',{name:'Clear filters',exact:true}).click();await page.getByRole('checkbox',{name:'Bitter',exact:true}).check();await expect(page.getByRole('heading',{name:'No recipes in this view'})).toBeVisible();
  await page.getByRole('button',{name:'Show all recipes',exact:true}).click();await expect(page.getByRole('article')).toHaveCount(20);
  await page.getByRole('button',{name:'Next',exact:true}).click();await expect(page.getByRole('article').first()).toContainText('Gong bao chicken');await page.reload();await expect(page.getByRole('article').first()).toContainText('Gong bao chicken');
  const after=(await service.request('/snapshot')).data;expect(after.shoppingRecipeIds).toEqual(['gong-bao-chicken']);expect(after.pantry).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(page.locator('vite-error-overlay')).toHaveCount(0);expect(errors).toEqual([]);
 });
}
test('pantry visibly separates food and seasonings and includes both in shopping quantities',async({page,service})=>{
 await page.goto(service.url);await page.getByRole('button',{name:'Use sample pantry',exact:true}).click();await page.getByRole('link',{name:'My pantry',exact:true}).click();
 await page.getByLabel('Ingredient',{exact:true}).selectOption('salt');await page.getByLabel('Quantity',{exact:true}).fill('1');await page.getByRole('button',{name:'Add ingredient',exact:true}).click();
 await expect(page.getByRole('list',{name:'Seasonings',exact:true})).toContainText('Salt');await expect(page.getByRole('list',{name:'Food ingredients',exact:true})).toContainText('Eggs');
 await page.getByRole('link',{name:'Find recipes',exact:true}).first().click();await page.getByRole('link',{name:'View recipe: Tomato & egg stir-fry',exact:true}).click();await page.getByRole('button',{name:'Add missing ingredients to list',exact:true}).click();
 const shortages=(await service.request('/snapshot')).data.shopping.shortages;expect(shortages.find(i=>i.ingredientId==='salt').quantity).toBe(2);expect(shortages.find(i=>i.ingredientId==='tomato').quantity).toBe(1);
});
