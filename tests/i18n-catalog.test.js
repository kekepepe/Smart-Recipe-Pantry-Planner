import test from 'node:test';
import assert from 'node:assert/strict';
import { ingredients, recipes } from '../data/catalog.js';
import { ZH_INGREDIENTS } from '../web/i18n/zh-ingredients.js';
import { ZH_RECIPES } from '../web/i18n/zh-recipes.js';

test('i18n catalog: all 286 ingredients have pure-Chinese translations with zero English letters', () => {
  assert.equal(ingredients.length, 286);
  for (const ing of ingredients) {
    const zh = ZH_INGREDIENTS[ing.id];
    assert(typeof zh === 'string' && zh.trim().length > 0, `Missing ZH_INGREDIENTS entry for ${ing.id}`);
    assert(!/[A-Za-z]/.test(zh), `Latin characters leaked in ZH_INGREDIENTS.${ing.id}: ${zh}`);
  }
});

test('i18n catalog: all 100 recipes have pure-Chinese titles, descriptions and matching step counts with zero English letters', () => {
  assert.equal(recipes.length, 100);
  for (const recipe of recipes) {
    const zh = ZH_RECIPES[recipe.id];
    assert(zh, `Missing ZH_RECIPES entry for ${recipe.id}`);
    assert(typeof zh.title === 'string' && zh.title.trim().length > 0, `Missing title for ${recipe.id}`);
    assert(!/[A-Za-z]/.test(zh.title), `Latin leaked in title for ${recipe.id}: ${zh.title}`);
    assert(typeof zh.description === 'string' && zh.description.trim().length > 0, `Missing description for ${recipe.id}`);
    assert(!/[A-Za-z]/.test(zh.description), `Latin leaked in description for ${recipe.id}: ${zh.description}`);
    assert.equal(zh.steps.length, recipe.steps.length, `Step count mismatch for ${recipe.id}`);
    for (const step of zh.steps) {
      assert(typeof step === 'string' && step.trim().length > 0, `Empty step for ${recipe.id}`);
      assert(!/[A-Za-z]/.test(step), `Latin leaked in step for ${recipe.id}: ${step}`);
    }
  }
});
