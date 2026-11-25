import { test as base, expect } from '@playwright/test';
import { createApp } from '../../server/app.js';
import { Store } from '../../server/services/store.js';
import { fixture, listen } from '../helpers.js';

const test = base.extend({
  database: async ({}, use) => { const f = fixture(); try { await use(f); } finally { f.close(); } },
  service: async ({ database }, use) => {
    const s = await listen(createApp(database.db, {
      serveStatic: true,
      now: () => new Date('2026-11-25T08:00:00.000Z'), // 2026-11-25 Asia/Shanghai
    }));
    try { await use(s); } finally { await s.close(); }
  },
});

for (const [name, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 375, height: 812 }]]) {
  test(`daily inspiration ${name} (B11/B13/B19/C07/C11/C16): empty pantry, pantry invariance, multi-recipe handoff, filter retention and retry`, async ({ page, service, database }, info) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

    await page.setViewportSize(viewport);
    await page.goto(service.url + '/#/recipes');

    // Switch to Daily inspiration tab on empty pantry (B11).
    const tab = page.getByRole('tab', { name: 'Daily inspiration · 每日灵感', exact: true });
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('2026-11-25 (Asia/Shanghai)', { exact: false })).toBeVisible();
    await expect(page.getByRole('article')).toHaveCount(3);

    const initialTitles = await page.locator('article h2').allTextContents();
    expect(new Set(initialTitles).size).toBe(3);
    await page.screenshot({ path: info.outputPath(`inspiration-${name}.png`), fullPage: true });

    // C07: Mutating pantry updates real shortage annotations without changing today's picked recipes.
    const store = new Store(database.db);
    const inspBefore = (await service.request('/inspiration')).data;
    const firstRecipe = inspBefore.recipes[0];
    let rev = store.getSnapshot().revision;
    for (const req of firstRecipe.requirements) {
      rev = store.saveItem(req.ingredientId, { quantity: req.quantity, unit: req.unit, expectedRevision: rev }).revision;
    }
    await page.reload();
    await expect(page.getByRole('tab', { name: 'Daily inspiration · 每日灵感', exact: true })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('article')).toHaveCount(3);
    expect(await page.locator('article h2').allTextContents()).toEqual(initialTitles);
    await expect(page.getByRole('article').first()).toContainText('Can make now');

    // Filter sharing (<3 candidates) + zero results + clear without affecting pantry (C11).
    await page.locator('.discovery-panel > summary').click();
    await page.getByRole('checkbox', { name: '川菜 Sichuan', exact: true }).check();
    await expect(page.getByRole('article')).toHaveCount(2);
    await expect(page.getByText('2 daily picks from 2 matching recipes', { exact: false })).toBeVisible();

    // B13/C16: Pre-existing shopping selection is preserved when adding from Daily inspiration -> Detail -> Shopping.
    const existing = store.selectRecipe({ recipeId: 'tomato-skillet', expectedRevision: store.getSnapshot().revision });
    expect(existing.shoppingRecipeIds).toEqual(['tomato-skillet']);
    await page.reload();
    await expect(page.getByRole('article')).toHaveCount(2);

    const pickedTitle = await page.locator('article h2').first().textContent();
    await page.getByRole('article').first().getByRole('link', { name: `View recipe: ${pickedTitle}`, exact: true }).click();
    await expect(page.getByRole('heading', { name: pickedTitle, exact: true })).toBeVisible();
    await page.getByRole('button', { name: /^(Add missing ingredients to list|Add recipe to shopping list)$/ }).click();
    const selectedRegion = page.getByRole('region', { name: 'Selected recipes', exact: true });
    await expect(selectedRegion).toContainText('Warm tomato skillet');
    await expect(selectedRegion).toContainText(pickedTitle);

    // Return to recipes preserves view=inspiration AND active Sichuan filter across navigation and refresh.
    await page.getByRole('link', { name: 'Add more recipes', exact: true }).click();
    await expect(page.getByRole('tab', { name: 'Daily inspiration · 每日灵感', exact: true })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('checkbox', { name: '川菜 Sichuan', exact: true })).toBeChecked();
    await expect(page.getByRole('article')).toHaveCount(2);
    await page.reload();
    await expect(page.getByRole('article')).toHaveCount(2);

    // Zero matches state and clear filters.
    await page.getByRole('checkbox', { name: '苦 Bitter', exact: true }).check();
    await expect(page.getByRole('heading', { name: 'No inspiration matches these filters' })).toBeVisible();
    await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
    await expect(page.getByRole('article')).toHaveCount(3);
    expect((await service.request('/snapshot')).data.shoppingRecipeIds.length).toBe(2);

    // Failure & retry flow on desktop.
    if (name === 'desktop') {
      await page.route('**/api/inspiration*', route => route.fulfill({
        status: 503,
        json: { error: { code: 'STORAGE_UNAVAILABLE', message: 'Temporary inspiration error.' } },
      }), { times: 1 });
      await page.getByRole('checkbox', { name: '日本 Japan', exact: true }).check();
      await expect(page.getByRole('heading', { name: 'Unable to load daily inspiration' })).toBeVisible();
      await page.getByRole('button', { name: 'Try again', exact: true }).click();
      await expect(page.getByRole('article')).toHaveCount(3);
    }

    // B19: No horizontal overflow and no console/page errors (excluding intentional 503 network error if logged).
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator('vite-error-overlay')).toHaveCount(0);
    const unexpected = errors.filter(msg => !msg.includes('503 (Service Unavailable)'));
    expect(unexpected).toEqual([]);
  });
}

test('daily inspiration (B12): browser timezone override does not alter server Asia/Shanghai date or picks', async ({ browser, service }) => {
  const context = await browser.newContext({ timezoneId: 'America/New_York' });
  const page = await context.newPage();
  try {
    await page.goto(service.url + '/?view=inspiration#/recipes');
    await expect(page.getByText('2026-11-25 (Asia/Shanghai)', { exact: false })).toBeVisible();
    await expect(page.getByRole('article')).toHaveCount(3);
  } finally {
    await context.close();
  }
});
