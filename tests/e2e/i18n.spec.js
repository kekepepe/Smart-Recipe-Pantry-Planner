import { test as base, expect } from '@playwright/test';
import { createApp } from '../../server/app.js';
import { fixture, listen } from '../helpers.js';

const test = base.extend({
  database: async ({}, use) => { const f = fixture(); try { await use(f); } finally { f.close(); } },
  service: async ({ database }, use) => {
    const s = await listen(createApp(database.db, { serveStatic: true }));
    try { await use(s); } finally { await s.close(); }
  },
});

async function collectVisibleAndControlText(page) {
  return page.evaluate(() => {
    const parts = [
      document.title,
      document.body.innerText,
      ...[...document.querySelectorAll('option')].map(el => el.textContent || ''),
      ...[...document.querySelectorAll('optgroup')].map(el => el.label || ''),
      ...[...document.querySelectorAll('input[placeholder]')].map(el => el.getAttribute('placeholder') || ''),
    ];
    return {
      htmlLang: document.documentElement.lang,
      combined: parts.join('\n'),
    };
  });
}

function assertPureEnglish({ htmlLang, combined }, context) {
  expect(htmlLang, `${context}: html lang`).toBe('en');
  const cjk = combined.match(/[\u4e00-\u9fff]+/g) || [];
  expect(cjk, `${context}: unexpected Chinese text in English mode`).toEqual([]);
}

function assertPureChinese({ htmlLang, combined }, context) {
  expect(htmlLang, `${context}: html lang`).toBe('zh-CN');
  const latin = combined.match(/[A-Za-z]+/g) || [];
  expect(latin, `${context}: unexpected English text in Chinese mode`).toEqual([]);
}

for (const [name, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 375, height: 812 }]]) {
  test(`Issue #40 (${name}): pure English default, full Chinese toggle, dynamic <html lang>, and persistence`, async ({ page, service }, info) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

    await page.setViewportSize(viewport);
    await page.goto(service.url);

    // 1. Default English mode: Home -> Sample Pantry -> Recipes -> Detail -> Shopping -> Pantry
    assertPureEnglish(await collectVisibleAndControlText(page), `${name} EN Home`);

    await page.getByRole('button', { name: 'Use sample pantry' }).click();
    await expect(page.getByRole('article')).toHaveCount(20);
    assertPureEnglish(await collectVisibleAndControlText(page), `${name} EN Recipes`);

    await page.getByRole('tab', { name: 'Daily inspiration', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Daily inspiration' }).getByRole('article')).toHaveCount(3);
    assertPureEnglish(await collectVisibleAndControlText(page), `${name} EN Inspiration`);
    await page.getByRole('tab', { name: 'Use what I have', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Staple-based recommendations' }).getByRole('article')).toHaveCount(20);
    assertPureEnglish(await collectVisibleAndControlText(page), `${name} EN Staples`);
    await page.getByRole('tab', { name: 'All recipes', exact: true }).click();

    await page.getByRole('link', { name: 'My pantry', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'My pantry' })).toBeVisible();
    assertPureEnglish(await collectVisibleAndControlText(page), `${name} EN Pantry`);

    await page.getByRole('link', { name: 'Find recipes', exact: true }).first().click();
    await page.getByRole('link', { name: 'View recipe: Tomato & egg stir-fry', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Tomato & egg stir-fry' })).toBeVisible();
    // Open adaptation details to verify hidden details text too.
    await page.locator('details.source > summary').click();
    assertPureEnglish(await collectVisibleAndControlText(page), `${name} EN Detail`);

    await page.getByRole('button', { name: 'Add missing ingredients to list', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Shopping list' })).toBeVisible();
    assertPureEnglish(await collectVisibleAndControlText(page), `${name} EN Shopping`);

    await page.getByRole('list', { name: 'Missing ingredients', exact: true }).getByRole('checkbox', { name: 'Tomatoes', exact: true }).click();
    await expect(page.getByRole('list', { name: 'Purchased ingredients' }).getByRole('checkbox').first()).toBeChecked();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

    // 2. Switch to Chinese mode: dynamic <html lang="zh-CN"> + 100% pure Chinese across every page
    await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
    await expect(page.getByRole('heading', { name: '购物清单' })).toBeVisible();
    assertPureChinese(await collectVisibleAndControlText(page), `${name} ZH Shopping`);

    // Persistence across reload
    await page.reload();
    await expect(page.getByRole('heading', { name: '购物清单' })).toBeVisible();
    assertPureChinese(await collectVisibleAndControlText(page), `${name} ZH Shopping after reload`);

    await expect(page.getByRole('list', { name: '已购食材' }).getByRole('checkbox').first()).toBeChecked();

    // Home in Chinese
    await page.getByRole('link', { name: '今天吃什么首页' }).click();
    await expect(page.getByRole('heading', { name: '好味道，从手边的食材开始。' })).toBeVisible();
    assertPureChinese(await collectVisibleAndControlText(page), `${name} ZH Home`);

    // Pantry in Chinese (checks all 286 dropdown options + saved list + units)
    await page.getByRole('link', { name: '我的库存', exact: true }).click();
    await expect(page.getByRole('heading', { name: '我的库存' })).toBeVisible();
    assertPureChinese(await collectVisibleAndControlText(page), `${name} ZH Pantry`);

    // Recipes in Chinese (page 1 + page 2 world dishes)
    await page.getByRole('link', { name: '查找菜谱', exact: true }).first().click();
    await expect(page.getByRole('heading', { name: '今天可以做什么？' })).toBeVisible();
    assertPureChinese(await collectVisibleAndControlText(page), `${name} ZH Recipes page 1`);

    await page.getByRole('tab', { name: '每日灵感', exact: true }).click();
    await expect(page.getByRole('region', { name: '每日灵感' }).getByRole('article')).toHaveCount(3);
    assertPureChinese(await collectVisibleAndControlText(page), `${name} ZH Inspiration`);
    await page.getByRole('tab', { name: '用现有食材', exact: true }).click();
    await expect(page.getByRole('region', { name: '主食材推荐' }).getByRole('article')).toHaveCount(20);
    assertPureChinese(await collectVisibleAndControlText(page), `${name} ZH Staples`);
    await page.getByRole('tab', { name: '全部菜谱', exact: true }).click();
    await page.screenshot({ path: info.outputPath(`i18n-zh-recipes-${name}.png`) });

    await page.getByRole('button', { name: '下一页', exact: true }).click();
    await expect(page.getByText('第 2 / 5 页', { exact: false }).first()).toBeVisible();
    assertPureChinese(await collectVisibleAndControlText(page), `${name} ZH Recipes page 2`);

    // World recipe detail (CC BY-SA 4.0 license + steps + adaptation details) in Chinese
    await page.getByLabel('搜索菜谱').fill('牛丼');
    await expect(page.getByRole('article')).toHaveCount(1);
    await page.getByRole('link', { name: '查看菜谱：牛丼', exact: true }).click();
    await expect(page.getByRole('heading', { name: '牛丼' })).toBeVisible();
    await page.locator('details.source > summary').click();
    assertPureChinese(await collectVisibleAndControlText(page), `${name} ZH Detail (Gyudon)`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

    // 3. Switch back to English and verify <html lang="en"> and 0 Chinese chars
    await page.getByRole('button', { name: '将界面语言切换为英文' }).click();
    await expect(page.getByRole('heading', { name: 'Gyudon' })).toBeVisible();
    assertPureEnglish(await collectVisibleAndControlText(page), `${name} EN Detail after switch back`);
    expect(errors).toEqual([]);
  });
}
