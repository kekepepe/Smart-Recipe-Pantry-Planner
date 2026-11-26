import { test as base, expect } from '@playwright/test';
import { createApp } from '../../server/app.js';
import { fixture, listen } from '../helpers.js';

const test = base.extend({
  service: async ({}, use) => {
    const database = fixture();
    try {
      const service = await listen(createApp(database.db, { serveStatic: true }));
      try { await use(service); } finally { await service.close(); }
    } finally { database.close(); }
  },
});

test('inventory search filters and clears choices without saving a draft', async ({ page, service }, info) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (['error', 'warning'].includes(message.type())) errors.push(message.text());
  });
  await page.goto(`${service.url}/#/pantry`);
  await expect(page).toHaveTitle(/Pantry & Plate/);
  await expect(page.getByRole('heading', { name: 'My pantry' })).toBeVisible();
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  const search = page.getByRole('textbox', { name: 'Search ingredients' });
  const ingredient = page.getByLabel('Ingredient', { exact: true });
  const choices = ingredient.locator('optgroup option');
  const initial = (await service.request('/snapshot')).data;
  await expect(choices).toHaveCount(initial.ingredients.length);

  await search.fill('  ＴＯＭＡ ');
  const expectedNames = initial.ingredients
    .filter(item => item.name.toLowerCase().includes('toma'))
    .map(item => item.name).sort();
  await expect.poll(async () => (await choices.allTextContents()).sort()).toEqual(expectedNames);
  await ingredient.selectOption('tomato');
  await page.screenshot({ path: info.outputPath('ingredient-search-en.png') });
  await expect(page.getByLabel('Unit', { exact: true })).toHaveValue('piece');
  const quantity = page.getByLabel('Quantity', { exact: true });
  await quantity.fill('2');
  await search.fill('no-matching-ingredient');
  await search.press('Enter');
  await expect(choices).toHaveCount(0);
  await expect(page.getByRole('status').filter({ hasText: 'No ingredients match' })).toBeVisible();
  await expect(ingredient).toHaveValue('tomato');
  await expect(quantity).toHaveValue('2');
  expect((await service.request('/snapshot')).data.revision).toBe(initial.revision);

  await page.getByRole('button', { name: 'Clear search' }).click();
  await expect(search).toBeFocused();
  await expect(search).toHaveValue('');
  await expect(choices).toHaveCount(initial.ingredients.length);
  await expect(page.getByText('No ingredients match', { exact: false })).toHaveCount(0);
  expect(errors).toEqual([]);
  await quantity.fill('-1');
  const rejection = page.waitForResponse(response => response.url().endsWith('/api/pantry/tomato'));
  await page.getByRole('button', { name: 'Add ingredient', exact: true }).click();
  expect((await rejection).status()).toBe(422);
  await expect(page.getByRole('alert')).toContainText('0 to 1,000,000');
  await quantity.fill('2');
  await page.getByRole('button', { name: 'Add ingredient', exact: true }).click();
  await expect(page.getByRole('list', { name: 'Food ingredients' })).toContainText('2 piece');
  await page.reload();
  await expect(page.getByRole('list', { name: 'Food ingredients' })).toContainText('2 piece');
  expect((await service.request('/snapshot')).data.pantry).toEqual([
    { ingredientId: 'tomato', quantity: 2, unit: 'piece' },
  ]);
  expect(errors.filter(message => !message.includes('status of 422 (Unprocessable Entity)'))).toEqual([]);
});

test('inventory search matches Chinese names on a mobile viewport', async ({ page, service }, info) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${service.url}/#/pantry`);
  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  await expect(page.getByRole('heading', { name: '我的库存' })).toBeVisible();
  const search = page.getByRole('textbox', { name: '搜索食材' });
  const ingredient = page.getByLabel('食材', { exact: true });
  const choices = ingredient.locator('optgroup option');
  const initialCount = await choices.count();

  await search.fill('番茄');
  await expect(ingredient.locator('option[value="tomato"]')).toHaveText('番茄');
  await expect(ingredient.locator('option[value="egg"]')).toHaveCount(0);
  await search.fill('番');
  await expect(ingredient.locator('option[value="tomato"]')).toHaveCount(1);
  expect(await choices.count()).toBeLessThan(initialCount);
  await expect(page.getByRole('button', { name: '清除搜索' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await search.scrollIntoViewIfNeeded();
  await ingredient.selectOption('tomato');
  await page.screenshot({ path: info.outputPath('ingredient-search-zh-mobile.png'), fullPage: true });
  await page.getByLabel('数量', { exact: true }).fill('2');
  await page.getByRole('button', { name: '添加食材', exact: true }).click();
  await expect(search).toHaveValue('');
  await expect(page.getByRole('list', { name: '主食材列表' })).toContainText('番茄');
});
