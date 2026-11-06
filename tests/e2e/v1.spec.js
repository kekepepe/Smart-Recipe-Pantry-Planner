import { test as base, expect } from '@playwright/test';
import { createApp } from '../../server/app.js';
import { Store } from '../../server/services/store.js';
import { fixture, listen } from '../helpers.js';
const test = base.extend({
  database: async ({}, use) => { const f = fixture(); try { await use(f); } finally { f.close(); } },
  service: async ({ database }, use) => { const s = await listen(createApp(database.db, { serveStatic: true })); try { await use(s); } finally { await s.close(); } },
});
test.beforeEach(async ({ page, service }) => { await page.goto(service.url); });
const sample = page => page.getByRole('button', { name: 'Use sample pantry' }).click();
const tomato = page => page.getByRole('link', { name: 'View recipe: Warm tomato skillet', exact: true }).click();
const add = page => page.getByRole('button', { name: 'Add missing ingredients to list', exact: true }).click();

test('P1–P4: sample, single list, no double addition, pantry edit and browser refresh', async ({ page }, info) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (['error', 'warning'].includes(m.type())) errors.push(m.text()); });
  await expect(page).toHaveTitle(/Pantry & Plate/); await sample(page);
  await expect(page.getByRole('article')).toHaveCount(20);
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('v1-desktop-recipes.png') });
  await tomato(page); await expect(page.getByRole('cell', { name: '1 piece', exact: true })).toHaveCount(2); await add(page);
  await expect(page.getByRole('list', { name: 'Missing ingredients' })).toContainText('1 piece');
  await page.getByRole('link', { name: 'View recipe', exact: true }).click(); await add(page);
  await expect(page.getByRole('list', { name: 'Missing ingredients' }).getByRole('listitem')).toHaveCount(1);
  await page.getByRole('link', { name: 'My pantry', exact: true }).click(); await page.getByRole('button', { name: 'Edit tomato', exact: true }).click();
  await page.getByLabel('Quantity', { exact: true }).fill('2'); await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Add ingredient', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Shopping list', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Nothing to buy' })).toBeVisible();
  await page.reload(); await expect(page.getByRole('heading', { name: 'Nothing to buy' })).toBeVisible();
  await page.getByRole('link', { name: 'Pantry and Plate home' }).click(); await expect(page.getByRole('link', { name: 'Continue with my pantry' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Use sample pantry' })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('A02/A05/A18: mobile pantry, validation draft, confirm deletion and incompatible units', async ({ page }, info) => {
  await page.setViewportSize({ width: 375, height: 812 }); await sample(page); await tomato(page); await add(page);
  await page.getByRole('link', { name: 'My pantry', exact: true }).click(); await page.getByRole('button', { name: 'Edit tomato', exact: true }).click();
  await page.getByLabel('Quantity', { exact: true }).fill('-1'); await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('0 to 1,000,000'); await expect(page.getByLabel('Quantity', { exact: true })).toHaveValue('-1');
  await page.getByLabel('Quantity', { exact: true }).fill('100'); await page.getByLabel('Unit', { exact: true }).selectOption('g');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click(); await expect(page.getByRole('button', { name: 'Add ingredient', exact: true })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: info.outputPath('v1-mobile-pantry.png'), fullPage: true });
  await page.getByRole('link', { name: 'Shopping list', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Check your pantry units' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('v1-mobile-shopping.png') });
  await page.getByRole('link', { name: 'My pantry', exact: true }).click(); await page.getByRole('button', { name: 'Remove tomato', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click(); await expect(page.getByRole('button', { name: 'Edit tomato', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Remove tomato', exact: true }).click(); await page.getByRole('button', { name: 'Remove ingredient', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Edit tomato', exact: true })).toHaveCount(0);
});

test('20 recipes: Chinese search/category persist through detail, images load and source link is pinned', async ({ page, service }, info) => {
  await page.getByRole('link', { name: 'Browse all 20 recipes' }).click(); await expect(page.getByRole('article')).toHaveCount(20);
  const snapshot = (await service.request('/snapshot')).data;
  for (const recipe of snapshot.recipes) {
    const response = await page.request.get(service.url + recipe.image); expect(response.ok(), recipe.id).toBe(true); expect(response.headers()['content-type']).toMatch(/^image\//);
  }
  await page.getByLabel('Find a recipe').fill('西兰花'); await expect(page.getByRole('article')).toHaveCount(1);
  await page.getByRole('link', { name: 'View recipe: Garlic broccoli' }).click();
  await expect(page.getByRole('link', { name: 'View original recipe' })).toHaveAttribute('href', /308cc8b7/);
  await expect(page.getByRole('row')).toHaveCount(7);
  await page.screenshot({ path: info.outputPath('v1-recipe-detail.png'), fullPage: true });
  await page.getByRole('link', { name: 'Back to recipes', exact: true }).click(); await expect(page.getByLabel('Find a recipe')).toHaveValue('西兰花');
  await page.getByLabel('Find a recipe').fill(''); await page.getByLabel('Category').selectOption('Seafood'); await expect(page.getByRole('article')).toHaveCount(2);
  await page.setViewportSize({ width: 375, height: 812 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('A12: server commits but response is lost; UI retains draft and synchronizes instead of duplicating', async ({ page }) => {
  await sample(page); await page.getByRole('link', { name: 'My pantry', exact: true }).click(); await page.getByRole('button', { name: 'Edit tomato', exact: true }).click();
  await page.getByLabel('Quantity', { exact: true }).fill('5');
  await page.route('**/api/pantry/tomato', async route => { await route.fetch(); await route.abort('failed'); }, { times: 1 });
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByLabel('Quantity', { exact: true })).toHaveValue('5'); await expect(page.getByRole('form')).toContainText('could not be confirmed');
  await expect(page.getByRole('region', { name: 'Your ingredients' })).toContainText('5 piece');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click(); await expect(page.getByRole('button', { name: 'Add ingredient', exact: true })).toBeVisible();
  await page.reload(); await expect(page.getByRole('region', { name: 'Your ingredients' })).toContainText('5 piece');
});

test('A13: server conflict loads new snapshot without overwriting the form draft', async ({ page, database }) => {
  await sample(page); await page.getByRole('link', { name: 'My pantry', exact: true }).click(); await page.getByRole('button', { name: 'Edit tomato', exact: true }).click();
  await page.getByLabel('Quantity', { exact: true }).fill('8');
  const other = new Store(database.db); other.saveItem('tomato', { quantity: 4, unit: 'piece', expectedRevision: other.getSnapshot().revision });
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('form')).toContainText('another tab'); await expect(page.getByLabel('Quantity', { exact: true })).toHaveValue('8');
  await expect(page.getByRole('region', { name: 'Your ingredients' })).toContainText('4 piece');
});

test('A17: initial service failure offers retry; keyboard completes onboarding', async ({ page }) => {
  await page.route('**/api/snapshot', route => route.fulfill({ status: 503, json: { error: { code: 'STORAGE_UNAVAILABLE', message: 'Storage unavailable; retry.' } } }), { times: 1 });
  await page.reload(); await expect(page.getByRole('heading', { name: 'Unable to load' })).toBeVisible();
  await page.getByRole('button', { name: 'Try again' }).click(); await expect(page.getByRole('button', { name: 'Use sample pantry' })).toBeVisible();
  await page.getByRole('button', { name: 'Use sample pantry' }).focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'What can you make?' })).toBeVisible();
});
