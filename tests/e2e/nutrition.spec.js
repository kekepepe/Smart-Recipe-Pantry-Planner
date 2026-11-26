import { test as base, expect } from '@playwright/test';
import { createApp } from '../../server/app.js';
import { Store } from '../../server/services/store.js';
import { fixture, listen } from '../helpers.js';

// Verified-shape fixture mappings used only to exercise the P04 UI end to end against C03 rules.
const SAMPLE_MAPPINGS = [
  {
    ingredientId: 'egg',
    entryName: 'Egg, whole, raw',
    state: 'raw',
    kcalPer100g: 143,
    basisUnit: 'piece',
    gramsPerPiece: 55,
    sourceUrl: 'https://fdc.nal.usda.gov/fdc-app.html#/food-details/171287/nutrients',
    sourceDate: '2026-11-01',
    verifiedBy: 'ChangPeng',
  },
  {
    ingredientId: 'salt',
    entryName: 'Salt, table',
    state: 'raw',
    kcalPer100g: 0,
    basisUnit: 'g',
    sourceUrl: 'https://fdc.nal.usda.gov/fdc-app.html#/food-details/173464/nutrients',
    sourceDate: '2026-11-01',
    verifiedBy: 'ChangPeng',
    notes: 'Energy 0 per source; editorial fixed amount.',
  },
];

const test = base.extend({
  database: async ({}, use) => { const f = fixture(); try { await use(f); } finally { f.close(); } },
  emptyService: async ({ database }, use) => {
    const s = await listen(createApp(database.db, {
      serveStatic: true,
      nutritionMappings: [],
      now: () => new Date('2026-11-25T08:00:00.000Z'),
    }));
    try { await use(s); } finally { await s.close(); }
  },
  mappedService: async ({ database }, use) => {
    const s = await listen(createApp(database.db, {
      serveStatic: true,
      nutritionMappings: SAMPLE_MAPPINGS,
      now: () => new Date('2026-11-25T08:00:00.000Z'),
    }));
    try { await use(s); } finally { await s.close(); }
  },
});

for (const [label, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 375, height: 812 }]]) {
  test(`P04 nutrition (${label}): default unavailable state across list views, detail, and ZH switch without fabricated 0 kcal`, async ({ page, emptyService, database }, info) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

    const store = new Store(database.db);
    store.onboard({ mode: 'sample', expectedRevision: 0 });

    await page.setViewportSize(viewport);
    await page.goto(emptyService.url + '/#/recipes');

    // All recipes shows explicit Nutrition unavailable and never 0 kcal; availability stays intact.
    const scrambledCard = page.getByRole('article').filter({ hasText: 'Simple scrambled eggs' });
    await expect(scrambledCard).toContainText('Can make now');
    await expect(scrambledCard).toContainText('Nutrition unavailable');
    await expect(scrambledCard).not.toContainText('0 kcal');

    // Use what I have & Daily inspiration also show Nutrition unavailable.
    await page.getByRole('tab', { name: 'Use what I have', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Staple-based recommendations' }).getByRole('article').first()).toContainText('Nutrition unavailable');

    await page.getByRole('tab', { name: 'Daily inspiration', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Daily inspiration' }).getByRole('article').first()).toContainText('Nutrition unavailable');

    // Detail page shows honest unavailable reason & base servings, never 0 kcal.
    await page.goto(emptyService.url + '/#/recipes/tomato-eggs');
    const panel = page.getByRole('region', { name: 'Nutrition and energy estimate', exact: true });
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('Unavailable');
    await expect(panel).toContainText('Base servings: 2 servings');
    await expect(panel).toContainText('No verified nutrition mapping or unit conversion for required ingredients:');
    await expect(panel).toContainText('Eggs');
    await expect(panel).toContainText('Tomatoes');
    await expect(panel).not.toContainText('0 kcal');

    // Switch to Chinese and verify pure localized unavailable messaging.
    await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
    const zhPanel = page.getByRole('region', { name: '热量与营养来源说明', exact: true });
    await expect(zhPanel).toContainText('热量与营养来源');
    await expect(zhPanel).toContainText('暂不可用');
    await expect(zhPanel).toContainText('基础份数：2 人份');
    await expect(zhPanel).toContainText('鸡蛋');
    await expect(zhPanel).toContainText('番茄');
    await expect(zhPanel).not.toContainText('0 千卡');
    expect((await zhPanel.innerText()).match(/[A-Za-z]+/g) || []).toEqual([]);

    await page.screenshot({ path: info.outputPath(`nutrition-unavailable-${label}.png`), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}

test('P04 nutrition: estimated dishes display servings, whole/per-serving kcal, assumptions, sources, and stay pantry-invariant', async ({ page, mappedService, database }, info) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  const store = new Store(database.db);
  store.onboard({ mode: 'sample', expectedRevision: 0 });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(mappedService.url + '/#/recipes');

  // Estimated cards show rounded per-serving estimate; unmapped dishes stay unavailable.
  const scrambledCard = page.getByRole('article').filter({ hasText: 'Simple scrambled eggs' });
  await expect(scrambledCard).toContainText('Can make now');
  await expect(scrambledCard).toContainText('Est. 157 kcal / serving');

  const tomatoEggsCard = page.getByRole('article').filter({ hasText: 'Tomato & egg stir-fry' });
  await expect(tomatoEggsCard).toContainText('Nutrition unavailable');
  await expect(tomatoEggsCard).not.toContainText('0 kcal');

  const steamedCard = page.getByRole('article').filter({ hasText: 'Silky steamed eggs' });
  await expect(steamedCard).toContainText('Est. 157 kcal / serving');

  // Open Silky steamed eggs detail: verify servings, whole/per-serving kcal, estimate badge, assumptions, and sources.
  await steamedCard.getByRole('link', { name: 'View recipe: Silky steamed eggs', exact: true }).click();
  const panel = page.getByRole('region', { name: 'Nutrition and energy estimate', exact: true });
  await expect(panel).toContainText('Sourced estimate');
  await expect(panel).toContainText('Per serving');
  await expect(panel).toContainText('Whole dish');
  await expect(panel).toContainText('157 kcal');
  await expect(panel).toContainText('1 serving');
  await expect(panel).toContainText('not laboratory measurements');
  await expect(panel).toContainText('Key assumptions');
  await expect(panel).toContainText('Energy 0 per source; editorial fixed amount.');

  // Expand source records on demand.
  await panel.locator('details.nutrition-sources > summary').click();
  await expect(panel).toContainText('Nutrition sources (2 verified records)');
  await expect(panel).toContainText('Egg, whole, raw');
  await expect(panel).toContainText('Salt, table');
  await expect(panel).toContainText('55 g edible / piece');
  await expect(panel).toContainText('Verified by ChangPeng · 2026-11-01');
  await expect(panel.getByRole('link', { name: 'Source record' })).toHaveCount(2);

  await page.screenshot({ path: info.outputPath('nutrition-estimated-detail-desktop.png'), fullPage: true });

  // Mutating pantry stock must not alter recipe nutrition estimates.
  const rev = store.getSnapshot().revision;
  store.saveItem('egg', { quantity: 10, unit: 'piece', expectedRevision: rev });
  await page.reload();
  await expect(panel).toContainText('157 kcal');
  await expect(panel).toContainText('Sourced estimate');

  // Switch to Chinese and verify localized estimated display.
  await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
  const zhPanel = page.getByRole('region', { name: '热量与营养来源说明', exact: true });
  await expect(zhPanel).toContainText('基于公开来源估算');
  await expect(zhPanel).toContainText('157 千卡');
  await expect(zhPanel).toContainText('1 人份');
  await expect(zhPanel).toContainText('估算假设与说明');
  await expect(zhPanel).toContainText('热量来源明细（2 条核验记录）');

  // Partially mapped dish (Tomato & egg stir-fry has egg + salt mapped, tomato + oil unmapped) stays unavailable.
  await page.goto(mappedService.url + '/#/recipes/tomato-eggs');
  await expect(zhPanel).toContainText('暂不可用');
  await expect(zhPanel).toContainText('番茄');
  await expect(zhPanel).toContainText('食用油');
  await expect(zhPanel).toContainText('已核验的部分用料来源（2 条记录）');
  await expect(zhPanel.locator('.nutrition-metrics')).toHaveCount(0);
  expect(await zhPanel.innerText()).not.toContain('0 千卡');

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('P04 nutrition: API failures do not block recipes or detail and recover via Try again', async ({ page, mappedService }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  // List nutrition failure + recovery.
  await page.route('**/api/nutrition', route => route.fulfill({
    status: 503,
    json: { error: { code: 'STORAGE_UNAVAILABLE', message: 'Nutrition temporarily unavailable.' } },
  }), { times: 1 });

  await page.goto(mappedService.url + '/#/recipes');
  await expect(page.getByRole('article')).toHaveCount(20);
  const indexError = page.locator('.nutrition-index-error');
  await expect(indexError).toBeVisible();
  await indexError.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByRole('article').filter({ hasText: 'Simple scrambled eggs' })).toContainText('Est. 157 kcal / serving');

  // Detail nutrition failure + recovery (recipe ingredients and steps still render).
  await page.route('**/api/nutrition/steamed-eggs', route => route.fulfill({
    status: 503,
    json: { error: { code: 'STORAGE_UNAVAILABLE', message: 'Nutrition detail temporarily unavailable.' } },
  }), { times: 1 });

  await page.goto(mappedService.url + '/#/recipes/steamed-eggs');
  await expect(page.getByRole('heading', { name: 'What you need' })).toBeVisible();
  const panel = page.getByRole('region', { name: 'Nutrition and energy estimate', exact: true });
  await expect(panel).toContainText('Nutrition detail temporarily unavailable.');
  await panel.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(panel).toContainText('157 kcal');

  const unexpected = errors.filter(msg => !msg.includes('503 (Service Unavailable)'));
  expect(unexpected).toEqual([]);
});

test('P04 nutrition: catalog changes hide stale estimates and retry only accepts current data', async ({ page, mappedService }) => {
  const { data: snapshot } = await mappedService.request('/snapshot');
  const { data: nutrition } = await mappedService.request('/nutrition');
  const pendingRequest = Promise.withResolvers();
  const releasePending = Promise.withResolvers();
  const middleVersion = 'catalog-under-test-2';
  const finalVersion = 'catalog-under-test-3';
  let catalogVersion = snapshot.catalogVersion;
  let failCurrentRequest = true;
  let replyVersion = finalVersion;

  await page.route('**/api/snapshot', route => route.fulfill({ json: { ...snapshot, catalogVersion } }));
  await page.route('**/api/nutrition', async route => {
    const requestedVersion = catalogVersion;
    if (requestedVersion === middleVersion) {
      pendingRequest.resolve();
      await releasePending.promise;
      return route.fulfill({ json: { ...nutrition, catalogVersion: middleVersion } });
    }
    if (requestedVersion === finalVersion && failCurrentRequest) {
      failCurrentRequest = false;
      return route.fulfill({
        status: 503,
        json: { error: { code: 'STORAGE_UNAVAILABLE', message: 'Nutrition temporarily unavailable.' } },
      });
    }
    return route.fulfill({ json: {
      ...nutrition,
      catalogVersion: requestedVersion === finalVersion ? replyVersion : requestedVersion,
    } });
  });

  try {
    await page.goto(mappedService.url + '/#/recipes');
    const card = page.getByRole('article').filter({ hasText: 'Simple scrambled eggs' });
    const estimate = 'Est. 157 kcal / serving';
    await expect(card).toContainText(estimate);

    catalogVersion = middleVersion;
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await pendingRequest.promise;
    await expect(card).not.toContainText(estimate);

    catalogVersion = finalVersion;
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    const retry = page.locator('.nutrition-index-error').getByRole('button', { name: 'Try again', exact: true });
    await expect(retry).toBeVisible();
    await expect(card).not.toContainText(estimate);

    const lateResponse = page.waitForResponse(response => response.url().endsWith('/api/nutrition') && response.ok());
    releasePending.resolve();
    await lateResponse;
    await expect(retry).toBeVisible();
    await expect(card).not.toContainText(estimate);

    replyVersion = middleVersion;
    const mismatchedResponse = page.waitForResponse(response => response.url().endsWith('/api/nutrition') && response.ok());
    await retry.click();
    await mismatchedResponse;
    await expect(retry).toBeVisible();
    await expect(card).not.toContainText(estimate);

    replyVersion = finalVersion;
    await retry.click();
    await expect(card).toContainText(estimate);
    await expect(retry).toHaveCount(0);
  } finally {
    releasePending.resolve();
  }
});
