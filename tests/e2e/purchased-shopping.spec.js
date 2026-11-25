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
  test(`P03 purchased shopping ${name} (B02-B10/B19): mark/undo, partial gap, reload, completion, quantity change, unit conflicts, failure retry & 409 conflict`, async ({ page, service, database }, info) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

    const store = new Store(database.db);
    let s = store.onboard({ mode: 'sample', expectedRevision: 0 }); // egg 2, tomato 1
    s = store.selectRecipe({ recipeId: 'tomato-eggs', expectedRevision: s.revision }); // gaps: egg 1, tomato 1, oil 12 ml, salt 3 g

    await page.setViewportSize(viewport);
    await page.goto(service.url + '/#/shopping');

    const toBuyList = page.getByRole('list', { name: 'Missing ingredients', exact: true });
    const purchasedList = page.getByRole('list', { name: 'Purchased ingredients', exact: true });

    await expect(page.getByText('4 items left to buy', { exact: true })).toBeVisible();

    // B02: Mark partial-shortage items (egg 1 piece out of 3 required, tomato 1 piece out of 2 required) using final C02 gap API.
    await toBuyList.getByRole('checkbox', { name: 'Eggs', exact: true }).click();
    await expect(purchasedList.getByRole('checkbox', { name: 'Eggs', exact: true })).toBeChecked();
    await expect(page.getByText('3 items left to buy', { exact: true })).toBeVisible();

    // Verify pantry stock & recipe availability did NOT change after marking purchased.
    const afterEggMark = (await service.request('/snapshot')).data;
    expect(afterEggMark.pantry.find(i => i.ingredientId === 'egg').quantity).toBe(2);
    expect(afterEggMark.evaluations.find(e => e.recipeId === 'tomato-eggs').status).toBe('needsShopping');

    // Undo and re-mark via keyboard Space (B02 + B19).
    const eggPurchased = purchasedList.getByRole('checkbox', { name: 'Eggs', exact: true });
    await eggPurchased.focus();
    await page.keyboard.press('Space');
    await expect(toBuyList.getByRole('checkbox', { name: 'Eggs', exact: true })).not.toBeChecked();
    await expect(page.getByText('4 items left to buy', { exact: true })).toBeVisible();

    await toBuyList.getByRole('checkbox', { name: 'Eggs', exact: true }).click();
    await toBuyList.getByRole('checkbox', { name: 'Tomatoes', exact: true }).click();
    await expect(page.getByText('2 items left to buy', { exact: true })).toBeVisible();

    // B03: Refresh preserves checked state.
    await page.reload();
    await expect(page.getByText('2 items left to buy', { exact: true })).toBeVisible();
    await expect(purchasedList.getByRole('checkbox', { name: 'Eggs', exact: true })).toBeChecked();
    await expect(purchasedList.getByRole('checkbox', { name: 'Tomatoes', exact: true })).toBeChecked();

    // B04: Mark remaining items -> all purchased completion state, selected recipes and pantry preserved.
    await toBuyList.getByRole('checkbox', { name: 'Cooking oil', exact: true }).click();
    await toBuyList.getByRole('checkbox', { name: 'Salt', exact: true }).click();
    await expect(page.getByText('0 items left to buy', { exact: true })).toBeVisible();
    await expect(page.getByText('All items marked as purchased. Your pantry has not been updated.', { exact: true })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Selected recipes', exact: true }).getByRole('article')).toHaveCount(1);
    await page.screenshot({ path: info.outputPath(`p03-all-purchased-${name}.png`), fullPage: true });

    // B05/B06: Adding steamed-eggs increases egg gap (1 -> 3) & salt gap (3 -> 5), cancelling both with review prompts while tomato & oil stay marked.
    const revBeforeAdd = store.getSnapshot().revision;
    store.selectRecipe({ recipeId: 'steamed-eggs', expectedRevision: revBeforeAdd });
    await page.getByRole('button', { name: 'Reload saved data', exact: true }).click();
    await expect(page.getByText('2 items left to buy', { exact: true })).toBeVisible();
    await expect(toBuyList.getByRole('checkbox', { name: 'Eggs', exact: true })).not.toBeChecked();
    await expect(toBuyList.getByRole('checkbox', { name: 'Salt', exact: true })).not.toBeChecked();
    await expect(toBuyList.locator('.purchase-review')).toHaveCount(2);
    await expect(purchasedList.getByRole('checkbox', { name: 'Tomatoes', exact: true })).toBeChecked();
    await expect(purchasedList.getByRole('checkbox', { name: 'Cooking oil', exact: true })).toBeChecked();

    // Reconfirm egg at the new 3-piece gap.
    await toBuyList.getByRole('checkbox', { name: 'Eggs', exact: true }).click();
    await expect(purchasedList.getByRole('checkbox', { name: 'Eggs', exact: true })).toBeChecked();
    await expect(page.getByText('1 item left to buy', { exact: true })).toBeVisible();

    // B07: Filling egg gap to zero removes mark; restoring gap keeps egg unmarked (never revives).
    s = store.saveItem('egg', { quantity: 5, unit: 'piece', expectedRevision: store.getSnapshot().revision });
    s = store.saveItem('egg', { quantity: 4, unit: 'piece', expectedRevision: s.revision });
    await page.reload();
    await expect(toBuyList.getByRole('checkbox', { name: 'Eggs', exact: true })).not.toBeChecked();
    await expect(purchasedList.getByRole('checkbox', { name: 'Tomatoes', exact: true })).toBeChecked();

    // B08 (pantry mismatch): switching tomato to 500 g enters checkUnits, clears tomato mark, preserves cooking oil mark; restoring piece keeps tomato unmarked.
    s = store.saveItem('tomato', { quantity: 500, unit: 'g', expectedRevision: store.getSnapshot().revision });
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Check your pantry units', exact: true })).toBeVisible();
    s = store.saveItem('tomato', { quantity: 1, unit: 'piece', expectedRevision: s.revision });
    await page.reload();
    await expect(toBuyList.getByRole('checkbox', { name: 'Tomatoes', exact: true })).not.toBeChecked();
    await expect(purchasedList.getByRole('checkbox', { name: 'Cooking oil', exact: true })).toBeChecked();

    // B09: Failed save (503) shows error, keeps item unmarked, and retry succeeds.
    await page.route('**/api/purchased-marks/salt', route => route.fulfill({
      status: 503,
      json: { error: { code: 'STORAGE_UNAVAILABLE', message: 'Temporary storage error. Please retry.' } },
    }), { times: 1 });
    await toBuyList.getByRole('checkbox', { name: 'Salt', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Temporary storage error');
    await expect(toBuyList.getByRole('checkbox', { name: 'Salt', exact: true })).not.toBeChecked();
    await toBuyList.getByRole('checkbox', { name: 'Salt', exact: true }).click();
    await expect(purchasedList.getByRole('checkbox', { name: 'Salt', exact: true })).toBeChecked();

    // B10: Concurrent stale revision (409) reloads latest saved snapshot and prompts review.
    store.saveItem('tomato', { quantity: 0, unit: 'piece', expectedRevision: store.getSnapshot().revision });
    await toBuyList.getByRole('checkbox', { name: 'Tomatoes', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('The shopping list changed. Review the current quantity before trying again.');
    await expect(toBuyList.getByRole('listitem').filter({ hasText: 'Tomatoes' })).toContainText('2 piece');
    await toBuyList.getByRole('checkbox', { name: 'Tomatoes', exact: true }).click();
    await expect(purchasedList.getByRole('checkbox', { name: 'Tomatoes', exact: true })).toBeChecked();

    // B19: Zero horizontal overflow & no unexpected runtime errors.
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator('vite-error-overlay')).toHaveCount(0);
    const unexpected = errors.filter(msg => !msg.includes('503 (Service Unavailable)') && !msg.includes('409 (Conflict)'));
    expect(unexpected).toEqual([]);
  });
}

test('P03 purchased shopping (B08): recipe-to-recipe unit conflict clears conflicted mark and never revives after removal', async ({ page, service, database }) => {
  const store = new Store(database.db);
  let s = store.onboard({ mode: 'empty', expectedRevision: 0 });
  s = store.selectRecipe({ recipeId: 'tomato-skillet', expectedRevision: s.revision });

  await page.goto(service.url + '/#/shopping');
  const toBuyList = page.getByRole('list', { name: 'Missing ingredients', exact: true });
  const purchasedList = page.getByRole('list', { name: 'Purchased ingredients', exact: true });

  await toBuyList.getByRole('checkbox', { name: 'Tomatoes', exact: true }).click();
  await expect(purchasedList.getByRole('checkbox', { name: 'Tomatoes', exact: true })).toBeChecked();

  // Adding Ratatouille introduces a recipe-to-recipe unit clash on tomato (piece vs g) with empty pantry.
  s = store.selectRecipe({ recipeId: 'ratatouille', expectedRevision: store.getSnapshot().revision });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Check your pantry units', exact: true })).toBeVisible();

  // Removing Ratatouille restores the 2-piece tomato shortage unmarked (never revives).
  await page.getByRole('button', { name: 'Remove Ratatouille from list', exact: true }).click();
  await expect(toBuyList.getByRole('checkbox', { name: 'Tomatoes', exact: true })).not.toBeChecked();
  await expect(page.getByText('1 item left to buy', { exact: true })).toBeVisible();
});
