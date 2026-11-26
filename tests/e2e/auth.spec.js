import { test as base, expect } from '@playwright/test';
import { createApp } from '../../server/app.js';
import { Store } from '../../server/services/store.js';
import { fixture, listen } from '../helpers.js';

const test = base.extend({
  database: async ({}, use) => { const f = fixture(); try { await use(f); } finally { f.close(); } },
});

async function collectText(page) {
  return page.evaluate(() => ({
    htmlLang: document.documentElement.lang,
    combined: [
      document.title,
      document.body.innerText,
      ...[...document.querySelectorAll('input[placeholder]')].map(el => el.getAttribute('placeholder') || ''),
    ].join('\n'),
  }));
}

function assertPureEnglish({ htmlLang, combined }, ctx) {
  expect(htmlLang, ctx).toBe('en');
  expect(combined.match(/[\u4e00-\u9fff]+/g) || [], `${ctx}: unexpected CJK`).toEqual([]);
}

function assertPureChinese({ htmlLang, combined }, ctx) {
  expect(htmlLang, ctx).toBe('zh-CN');
  expect(combined.match(/[A-Za-z]+/g) || [], `${ctx}: unexpected Latin`).toEqual([]);
}

test('Issue #55 E2E: first-run setup (with existing data takeover notice), EN/ZH purity, password visibility toggle, sign out, deep-link isolation, and password change', async ({ page, database }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  // Pre-seed existing v1.0.1 data before account setup to verify takeover message & zero pre-auth leakage.
  const store = new Store(database.db);
  let snap = store.onboard({ mode: 'sample', expectedRevision: 0 });
  snap = store.selectRecipe({ recipeId: 'tomato-eggs', expectedRevision: snap.revision });

  const service = await listen(createApp(database.db, { serveStatic: true, maxFailedAttempts: 3, lockoutMs: 60_000 }), { authenticate: false });
  try {
    await page.setViewportSize({ width: 1440, height: 1000 });
    // Deep-link directly to /#/shopping BEFORE setup -> must show Setup screen, never shopping items.
    await page.goto(`${service.url}/#/shopping`);
    await expect(page.getByRole('heading', { name: 'Set up your local account' })).toBeVisible();
    await expect(page.getByText('take ownership of the existing pantry', { exact: false })).toBeVisible();
    await expect(page.getByText('Tomato & egg stir-fry')).toHaveCount(0);
    await expect(page.getByLabel(/Remember sign-in/)).not.toBeChecked();
    assertPureEnglish(await collectText(page), 'EN Setup');

    // Toggle to ZH on setup screen -> pure Chinese, zero English letters!
    await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
    await expect(page.getByRole('heading', { name: '首次设置本地账号' })).toBeVisible();
    await expect(page.getByText('接管这台设备上当前数据库已有', { exact: false })).toBeVisible();
    assertPureChinese(await collectText(page), 'ZH Setup');

    // Switch back to EN and complete setup with keyboard + visibility toggle.
    await page.getByRole('button', { name: '将界面语言切换为英文' }).click();
    await page.getByLabel('Username').fill('2026');
    const pwInput = page.locator('#auth-password');
    await pwInput.fill('initial-pass-1');
    await expect(pwInput).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Show password' }).click();
    await expect(pwInput).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Hide password' }).click();
    await expect(pwInput).toHaveAttribute('type', 'password');
    await page.locator('#auth-confirm-password').fill('initial-pass-1');
    await page.locator('#auth-confirm-password').press('Enter');

    // Lands directly on the deep-linked Shopping list with preserved v1.0.1 data!
    await expect(page.getByRole('heading', { name: 'Shopping list' })).toBeVisible();
    await expect(page.getByText('Tomato & egg stir-fry')).toBeVisible();

    // Refresh preserves active session even when remember-me was unchecked.
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Shopping list' })).toBeVisible();

    // Change password modal in ZH & EN: wrong current password shows error, valid change succeeds.
    await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
    await page.getByRole('button', { name: '修改密码', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    assertPureChinese(await collectText(page), 'ZH Change Password modal');
    await page.locator('#cp-current').fill('wrong-current');
    await page.locator('#cp-new').fill('updated-pass-2');
    await page.locator('#cp-confirm').fill('updated-pass-2');
    await page.getByRole('button', { name: '确认修改', exact: true }).click();
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText('当前密码不正确');

    await page.locator('#cp-current').fill('initial-pass-1');
    await page.getByRole('button', { name: '确认修改', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // Sign out -> returns to Sign-In, wipes personal data; reload/deep-link/Back never show old data!
    await page.getByRole('button', { name: '退出登录', exact: true }).click();
    await expect(page.getByRole('heading', { name: '登录以继续使用' })).toBeVisible();
    assertPureChinese(await collectText(page), 'ZH Sign-In');
    await expect(page.getByText('西红柿炒鸡蛋')).toHaveCount(0);

    await page.goto(`${service.url}/#/pantry`);
    await expect(page.getByRole('heading', { name: '登录以继续使用' })).toBeVisible();
    await expect(page.getByText('鸡蛋')).toHaveCount(0);

    // Old password fails with unified feedback; rate limit triggers after 3 attempts on this test server.
    await page.getByLabel('用户名').fill('2026');
    await page.locator('#auth-password').fill('initial-pass-1');
    await page.getByRole('button', { name: '登录', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('用户名或密码不正确');
    assertPureChinese(await collectText(page), 'ZH Sign-In error');

    // Sign in with new password succeeds.
    await page.locator('#auth-password').fill('updated-pass-2');
    await page.getByRole('button', { name: '登录', exact: true }).click();
    await expect(page.getByRole('heading', { name: '我的库存' })).toBeVisible();
    await expect(page.getByRole('list', { name: '主食材列表' }).getByText('鸡蛋', { exact: true })).toBeVisible();

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  } finally {
    await service.close();
  }
});

test('Issue #55 E2E: remember-me survives server restart; unchecked remember-me and logout require re-login on restart; mobile 375px layout clean', async ({ browser, database }) => {
  // Start server #1
  let service = await listen(createApp(database.db, { serveStatic: true }), { authenticate: false });
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await context.newPage();

  try {
    // 1. Setup WITHOUT remember-me on mobile viewport
    await page.goto(service.url);
    await expect(page.getByRole('heading', { name: 'Set up your local account' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByLabel('Username').fill('mobilechef');
    await page.locator('#auth-password').fill('secret-pass-1');
    await page.locator('#auth-confirm-password').fill('secret-pass-1');
    await page.getByRole('button', { name: 'Create account and continue' }).click();
    await expect(page.getByRole('button', { name: 'Use sample pantry' })).toBeVisible();
    await page.getByRole('button', { name: 'Use sample pantry' }).click();
    await expect(page.getByRole('heading', { name: 'What can you make?' })).toBeVisible();

    // 2. Restart server (same port not needed; Chromium sends host cookies across ports on 127.0.0.1!)
    // Without remember-me, new server rejects old session and shows Sign-In with zero personal data.
    await service.close();
    service = await listen(createApp(database.db, { serveStatic: true }), { authenticate: false });
    await page.goto(`${service.url}/#/recipes`);
    await expect(page.getByRole('heading', { name: 'Sign in to continue' })).toBeVisible();
    await expect(page.getByText('Simple scrambled eggs')).toHaveCount(0);

    // 3. Sign in WITH remember-me checked -> restart server -> auto-signs in cleanly!
    await page.getByLabel('Username').fill('mobilechef');
    await page.locator('#auth-password').fill('secret-pass-1');
    await page.getByLabel(/Remember sign-in/).check();
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'What can you make?' })).toBeVisible();

    await service.close();
    service = await listen(createApp(database.db, { serveStatic: true }), { authenticate: false });
    await page.goto(`${service.url}/#/recipes`);
    await expect(page.getByRole('heading', { name: 'What can you make?' })).toBeVisible();
    await expect(page.getByText('Simple scrambled eggs')).toBeVisible();

    // 4. Explicit sign out -> restart server -> must stay on Sign-In!
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Sign in to continue' })).toBeVisible();
    await service.close();
    service = await listen(createApp(database.db, { serveStatic: true }), { authenticate: false });
    await page.goto(`${service.url}/#/recipes`);
    await expect(page.getByRole('heading', { name: 'Sign in to continue' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally {
    await context.close();
    await service.close();
  }
});
