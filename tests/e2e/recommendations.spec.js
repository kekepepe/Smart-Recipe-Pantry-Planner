import { test as base, expect } from '@playwright/test';
import { createApp } from '../../server/app.js';
import { Store } from '../../server/services/store.js';
import { fixture, listen } from '../helpers.js';

const test = base.extend({
  database: async ({}, use) => { const f = fixture(); try { await use(f); } finally { f.close(); } },
  service: async ({ database }, use) => {
    const s = await listen(createApp(database.db, { serveStatic: true }));
    try { await use(s); } finally { await s.close(); }
  },
});

for (const [name, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 375, height: 812 }]]) {
  test(`staple recommendations ${name} (B19/C02-C06/C11/C16): empty states, groups, explainability, filters, pagination and shopping handoff`, async ({ page, service, database }, info) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

    await page.setViewportSize(viewport);
    await page.goto(service.url + '/#/recipes');

    // C02: Empty pantry -> explicit "No staple match yet" empty state with pantry/browse/inspiration links.
    const tab = page.getByRole('tab', { name: 'Use what I have · 用现有食材', exact: true });
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('heading', { name: 'No staple match yet' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Add pantry ingredients' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Browse all recipes' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Daily inspiration' })).toBeVisible();

    // Seasoning-only pantry still yields no staple match.
    const store = new Store(database.db);
    let rev = store.saveItem('salt', { quantity: 100, unit: 'g', expectedRevision: store.getSnapshot().revision }).revision;
    await page.reload();
    await expect(page.getByRole('heading', { name: 'No staple match yet' })).toBeVisible();

    // Remove salt and stock sample staples (egg 2, tomato 1).
    rev = store.deleteItem('salt', { expectedRevision: rev }).revision;
    rev = store.saveItem('egg', { quantity: 2, unit: 'piece', expectedRevision: rev }).revision;
    rev = store.saveItem('tomato', { quantity: 1, unit: 'piece', expectedRevision: rev }).revision;
    await page.reload();

    // C03/C04: Ranked matches appear in exact API order; steamed-eggs has staples ready but missing salt.
    await expect(page.getByText('43 matched recipes', { exact: false })).toBeVisible();
    await expect(page.getByRole('article')).toHaveCount(20);
    const firstCard = page.getByRole('article').nth(0);
    const secondCard = page.getByRole('article').nth(1);
    await expect(firstCard).toContainText('Simple scrambled eggs');
    await expect(firstCard).toContainText('Main foods ready · 主食材齐全');
    await expect(secondCard).toContainText('Silky steamed eggs');
    await expect(secondCard).toContainText('Main foods ready, seasonings still missing · 主食材齐全，仍缺调料');
    await expect(secondCard).toContainText('Owned 1/1 staples');
    await expect(secondCard).toContainText('Missing seasonings / 缺调料:');
    await expect(secondCard).toContainText('Need 2 g salt');
    await expect(secondCard).not.toContainText('Can make now');

    // Partial match card shows staple coverage, shortages and missing seasonings.
    const tomatoEggsCard = page.getByRole('article').filter({ hasText: 'Tomato & egg stir-fry' });
    await expect(tomatoEggsCard).toContainText('Partial staple match · 部分匹配');
    await expect(tomatoEggsCard).toContainText('Owned 2/2 staples');
    await expect(tomatoEggsCard).toContainText('Short 1 piece');
    await expect(tomatoEggsCard).toContainText('Missing seasonings / 缺调料:');
    await page.screenshot({ path: info.outputPath(`recommendations-${name}.png`), fullPage: true });

    // C06: Adding salt keeps recommendation order and staple counts identical while steamed-eggs becomes Can make now.
    rev = store.saveItem('salt', { quantity: 5, unit: 'g', expectedRevision: rev }).revision;
    await page.reload();
    await expect(page.getByRole('article').nth(0)).toContainText('Simple scrambled eggs');
    await expect(page.getByRole('article').nth(1)).toContainText('Silky steamed eggs');
    await expect(page.getByRole('article').nth(1)).toContainText('Main foods ready · 主食材齐全');
    await expect(page.getByRole('article').nth(1)).toContainText('Can make now');

    // Pagination slices the ranked list and survives refresh.
    const page1First = await page.locator('article h2').first().textContent();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.getByText('Page 2 / 3', { exact: false }).first()).toBeVisible();
    const page2First = await page.locator('article h2').first().textContent();
    expect(page2First).not.toBe(page1First);
    await page.reload();
    await expect(page.getByText('Page 2 / 3', { exact: false }).first()).toBeVisible();

    // Shared filters + zero-match empty state (hasStapleMatch=true -> offer clearing filters, NOT pantry prompt).
    await page.getByRole('checkbox', { name: '中国 China', exact: true }).check();
    await expect(page.getByText('8 matched recipes', { exact: false })).toBeVisible();
    await page.getByLabel('Find a recipe').fill('zzz-no-such-dish');
    await expect(page.getByRole('heading', { name: 'No matching staple recommendations' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'No staple match yet' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
    await expect(page.getByText('43 matched recipes', { exact: false })).toBeVisible();

    // C05: Uncomparable unit (tomato 500 g) puts tomato-eggs into checkUnits and never sufficient.
    rev = store.saveItem('tomato', { quantity: 500, unit: 'g', expectedRevision: rev }).revision;
    await page.reload();
    await page.getByLabel('Find a recipe').fill('Tomato & egg stir-fry');
    await expect(page.getByRole('article')).toHaveCount(1);
    const unitCard = page.getByRole('article').first();
    await expect(unitCard).toContainText('Check staple units · 主食材单位待核对');
    await expect(unitCard).toContainText('Check units (pantry: 500 g; recipe needs 2 piece)');
    await expect(unitCard).not.toContainText('Main foods ready');

    // Restore tomato to piece for C16 shopping handoff.
    rev = store.saveItem('tomato', { quantity: 1, unit: 'piece', expectedRevision: rev }).revision;
    rev = store.selectRecipe({ recipeId: 'tomato-skillet', expectedRevision: rev }).revision;
    await page.reload();
    await page.getByLabel('Find a recipe').fill('Silky steamed eggs');
    await expect(page.getByRole('article')).toHaveCount(1);
    await page.getByRole('link', { name: 'View recipe: Silky steamed eggs', exact: true }).click();
    await page.getByRole('button', { name: /^(Add missing ingredients to list|Add recipe to shopping list)$/ }).click();
    const selectedRegion = page.getByRole('region', { name: 'Selected recipes', exact: true });
    await expect(selectedRegion).toContainText('Warm tomato skillet');
    await expect(selectedRegion).toContainText('Silky steamed eggs');

    // Returning to recipes preserves view=staples and the active search query.
    await page.getByRole('link', { name: 'Add more recipes', exact: true }).click();
    await expect(page.getByRole('tab', { name: 'Use what I have · 用现有食材', exact: true })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByLabel('Find a recipe')).toHaveValue('Silky steamed eggs');
    await expect(page.getByRole('article')).toHaveCount(1);

    // Fetch error & retry on desktop.
    if (name === 'desktop') {
      await page.route('**/api/recommendations/staples*', route => route.fulfill({
        status: 503,
        json: { error: { code: 'STORAGE_UNAVAILABLE', message: 'Temporary recommendation error.' } },
      }), { times: 1 });
      await page.getByRole('button', { name: 'Clear filters / 清除筛选', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Unable to load recommendations' })).toBeVisible();
      await page.getByRole('button', { name: 'Try again', exact: true }).click();
      await expect(page.getByText('43 matched recipes', { exact: false })).toBeVisible();
    }

    // B19: No horizontal overflow and no unexpected console/page errors.
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator('vite-error-overlay')).toHaveCount(0);
    const unexpected = errors.filter(msg => !msg.includes('503 (Service Unavailable)'));
    expect(unexpected).toEqual([]);
  });
}
