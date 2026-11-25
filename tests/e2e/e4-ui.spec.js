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

async function inspectMissingLines(locator) {
  return locator.evaluate(el => {
    const text = el.textContent.trim();
    // Collect character positions across all text nodes inside .recipe-status.missing
    // and group characters by their visual line top coordinate to verify no visual line starts with ','.
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const lines = [];
    let node;
    while ((node = walker.nextNode())) {
      const value = node.nodeValue || '';
      for (let i = 0; i < value.length; i++) {
        const range = document.createRange();
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        const rect = range.getBoundingClientRect();
        if (!rect.width && !rect.height) continue;
        const y = Math.round(rect.top / 4) * 4;
        let line = lines.find(entry => Math.abs(entry.y - y) <= 4);
        if (!line) {
          line = { y, chars: '' };
          lines.push(line);
        }
        line.chars += value[i];
      }
    }
    lines.sort((a, b) => a.y - b.y);
    return { text, lines: lines.map(l => l.chars.trim()) };
  });
}

for (const [label, viewport] of [
  ['desktop-1440', { width: 1440, height: 1000 }],
  ['desktop-1200', { width: 1200, height: 720 }],
]) {
  test(`E4 #20 (${label}): sample pantry lands with collapsed filter panel, elevated availability tabs and first card above the fold`, async ({ page, service }, info) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

    await page.setViewportSize(viewport);
    await page.goto(service.url);
    await page.getByRole('button', { name: 'Use sample pantry' }).click();
    await expect(page.getByRole('heading', { name: 'What can you make?' })).toBeVisible();

    const panel = page.locator('.discovery-panel');
    await expect(panel).not.toHaveAttribute('open', '');

    const availabilityGroup = page.getByRole('group', { name: 'Filter recipes', exact: true });
    const firstCard = page.getByRole('article').first();
    await expect(availabilityGroup).toBeVisible();
    await expect(firstCard).toBeVisible();

    const [availBox, panelBox, cardBox] = await Promise.all([
      availabilityGroup.boundingBox(),
      panel.boundingBox(),
      firstCard.boundingBox(),
    ]);
    // Availability tabs sit above the collapsible filter panel and within the first viewport.
    expect(availBox.y + availBox.height).toBeLessThanOrEqual(panelBox.y + 1);
    expect(availBox.y + availBox.height).toBeLessThanOrEqual(viewport.height);
    // Top recipe card begins above the fold without scrolling.
    expect(cardBox.y).toBeLessThan(viewport.height);

    await page.screenshot({ path: info.outputPath(`e4-${label}.png`) });

    // Clicking "Can make now" immediately filters above the fold.
    await page.getByRole('button', { name: 'Can make now', exact: true }).click();
    await expect(page.getByRole('article').first()).toContainText('Can make now');

    // Expanding the panel and selecting a dimension filter keeps it open after reload.
    await page.getByRole('button', { name: 'All recipes', exact: true }).click();
    await panel.locator('> summary').click();
    await expect(panel).toHaveAttribute('open', '');
    await page.getByRole('checkbox', { name: '中国 China', exact: true }).check();
    await expect(panel.locator('> summary')).toContainText('1 selected');
    await page.reload();
    await expect(panel).toHaveAttribute('open', '');
    await expect(page.getByRole('checkbox', { name: '中国 China', exact: true })).toBeChecked();

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}

for (const [label, viewport] of [
  ['desktop-1440', { width: 1440, height: 1000 }],
  ['mobile-375', { width: 375, height: 812 }],
]) {
  test(`E4 #21 (${label}): multi-shortage summaries use clean inline commas without leading-comma wraps or stray spaces`, async ({ page, service, database }, info) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

    const store = new Store(database.db);
    store.onboard({ mode: 'sample', expectedRevision: 0 });

    await page.setViewportSize(viewport);
    await page.goto(service.url + '/#/recipes');

    // Check Tomato & egg stir-fry and Egg fried rice on page 1, then Gong bao chicken via search.
    const targets = [
      { query: '', title: 'Tomato & egg stir-fry', expectMore: true },
      { query: 'Egg fried rice', title: 'Egg fried rice', expectMore: true },
      { query: 'Gong bao chicken', title: 'Gong bao chicken', expectMore: true },
    ];

    for (const target of targets) {
      if (target.query) {
        await page.getByLabel('Find a recipe').fill(target.query);
      }
      const card = page.getByRole('article').filter({ hasText: target.title }).first();
      await expect(card).toBeVisible();
      const status = card.locator('.recipe-status.missing');
      await expect(status).toBeVisible();

      const { text, lines } = await inspectMissingLines(status);
      expect(text, target.title).toMatch(/^Need /);
      expect(text, target.title).not.toMatch(/\s,/); // no stray space before comma
      expect(text, target.title).not.toMatch(/,\s*,/);
      if (target.expectMore) {
        expect(text, target.title).toMatch(/\+ \d+ more$/);
      }
      for (const line of lines) {
        expect(line, `${target.title} wrapped line "${line}"`).not.toMatch(/^,/);
      }
    }

    await page.getByLabel('Find a recipe').fill('');
    await expect(page.getByRole('article')).toHaveCount(20);
    await page.screenshot({ path: info.outputPath(`e4-shortages-${label}.png`), fullPage: false });

    // Confirm ready and checkUnits labels are unaffected.
    await expect(page.getByRole('article').filter({ hasText: 'Simple scrambled eggs' })).toContainText('Can make now');
    store.saveItem('tomato', { quantity: 500, unit: 'g', expectedRevision: store.getSnapshot().revision });
    await page.reload();
    await expect(page.getByRole('article').filter({ hasText: 'Tomato & egg stir-fry' })).toContainText('Check units');

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}
