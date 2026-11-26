import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { _electron, expect } from '@playwright/test';
import { openDatabase } from '../server/db/connection.js';
import { catalogVersion } from '../server/db/seed.js';

const executable = process.argv[2];
if (!executable) throw new Error('Usage: node desktop/smoke.js <installed executable>');
const profile = await mkdtemp(join(tmpdir(), 'pantry-desktop-smoke-'));
const launchArgs = [`--user-data-dir=${profile}`];
if (process.platform === 'darwin' && process.env.CI) {
  launchArgs.push('--use-mock-keychain');
}
const launch = () => _electron.launch({ executablePath: resolve(executable), args: launchArgs });
const previousListeners = [];

async function reservePreviousOrigin(origin) {
  const { hostname, port } = new URL(origin);
  const listener = createServer();
  await new Promise((resolve, reject) => {
    listener.once('error', reject);
    listener.listen(Number(port), hostname, resolve);
  });
  previousListeners.push(listener);
}

try {
  let englishOrigin;
  let chineseOrigin;

  // 1. Fresh launch: offline setup WITHOUT remember-me, onboard sample pantry, mark purchased, switch to ZH, verify 403 desktop guard.
  let desktop = await launch();
  try {
    assert.equal(await desktop.evaluate(({ app }) => app.getName()), 'Pantry & Plate');
    const page = await desktop.firstWindow();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { name: 'Set up your local account', exact: true })).toBeVisible();
    await page.getByLabel('Username', { exact: true }).fill('smokeuser');
    await page.locator('#auth-password').fill('smoke-pass-123');
    await page.locator('#auth-confirm-password').fill('smoke-pass-123');
    await expect(page.getByLabel(/Remember sign-in/)).not.toBeChecked();
    await page.getByRole('button', { name: 'Create account and continue', exact: true }).click();

    await page.getByRole('button', { name: 'Use sample pantry', exact: true }).click();
    const recipe = page.getByRole('link', { name: 'View recipe: Tomato & egg stir-fry', exact: true });
    await recipe.click();
    await expect(page.getByRole('heading', { name: 'Tomato & egg stir-fry', exact: true })).toBeVisible();
    await expect.poll(async () => page.locator('main img').first().evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
    await page.getByRole('button', { name: 'Add missing ingredients to list', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Shopping list', exact: true })).toBeVisible();
    await page.getByRole('list', { name: 'Missing ingredients', exact: true }).getByRole('checkbox', { name: 'Tomatoes', exact: true }).click();
    await expect(page.getByRole('list', { name: 'Purchased ingredients', exact: true }).getByRole('checkbox', { name: 'Tomatoes', exact: true })).toBeChecked();
    englishOrigin = new URL(page.url()).origin;
    assert.match(englishOrigin, /^http:\/\/127\.0\.0\.1:\d+$/);
    const unauthenticated = await fetch(`${englishOrigin}/api/snapshot`);
    assert.equal(unauthenticated.status, 403);
    await unauthenticated.body?.cancel();
    await page.getByRole('button', { name: 'Switch interface language to Chinese' }).click();
    await expect(page.getByRole('heading', { name: '购物清单', exact: true })).toBeVisible();
  } finally {
    await desktop.close();
  }
  await reservePreviousOrigin(englishOrigin);

  const db = openDatabase(join(profile, 'pantry.sqlite'));
  try {
    db.prepare('UPDATE catalog_metadata SET version=? WHERE id=1').run('previous-catalog-for-smoke-test');
  } finally {
    db.close();
  }

  // 2. Restart WITHOUT remember-me -> lands on Sign-In (preserving ZH language across new port), then sign in WITH remember-me checked.
  desktop = await launch();
  try {
    const page = await desktop.firstWindow();
    chineseOrigin = new URL(page.url()).origin;
    assert.notEqual(chineseOrigin, englishOrigin);
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
    await expect(page.getByRole('heading', { name: '登录以继续使用', exact: true })).toBeVisible();
    await page.getByLabel('用户名', { exact: true }).fill('smokeuser');
    await page.locator('#auth-password').fill('smoke-pass-123');
    await page.getByLabel(/记住登录/).check();
    await page.getByRole('button', { name: '登录', exact: true }).click();

    await page.getByRole('link', { name: '购物清单', exact: true }).click();
    await expect(page.getByRole('list', { name: '已购食材', exact: true }).getByRole('checkbox', { name: '番茄', exact: true })).toBeChecked();
    const snapshot = await page.evaluate(async () => {
      const response = await fetch('/api/snapshot');
      if (!response.ok) throw new Error(`Snapshot HTTP ${response.status}`);
      return response.json();
    });
    assert.equal(snapshot.catalogVersion, catalogVersion);
    assert.equal(snapshot.recipes.length, 100);
    assert.equal((await readdir(profile)).filter(name => /^pantry-before-upgrade-.*\.sqlite$/.test(name)).length, 1);
    assert.deepEqual(snapshot.shoppingRecipeIds, ['tomato-eggs']);
    assert.equal(snapshot.pantry.find(item => item.ingredientId === 'egg')?.quantity, 2);
    assert.equal(snapshot.pantry.find(item => item.ingredientId === 'tomato')?.quantity, 1);
    await page.getByRole('button', { name: '将界面语言切换为英文' }).click();
    await expect(page.getByRole('heading', { name: 'Shopping list', exact: true })).toBeVisible();
  } finally {
    await desktop.close();
  }
  await reservePreviousOrigin(chineseOrigin);

  // 3. Restart WITH remember-me active -> auto-signs in via OS-protected store across a third port, preserving EN & shopping marks, then Sign out.
  desktop = await launch();
  try {
    const page = await desktop.firstWindow();
    const origin = new URL(page.url()).origin;
    assert.notEqual(origin, chineseOrigin);
    assert.notEqual(origin, englishOrigin);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await page.getByRole('link', { name: 'Shopping list', exact: true }).click();
    await expect(page.getByRole('list', { name: 'Purchased ingredients', exact: true }).getByRole('checkbox', { name: 'Tomatoes', exact: true })).toBeChecked();
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Sign in to continue', exact: true })).toBeVisible();
  } finally {
    await desktop.close();
  }

  // 4. Restart after Sign out -> stays on Sign-In.
  desktop = await launch();
  try {
    const page = await desktop.firstWindow();
    await expect(page.getByRole('heading', { name: 'Sign in to continue', exact: true })).toBeVisible();
  } finally {
    await desktop.close();
  }

  console.log('Desktop smoke passed: offline setup, auth guard, remember-me auto-sign-in, sign-out lock, catalog upgrade backup, and language, pantry and shopping persistence across new ports.');
} finally {
  await Promise.all(previousListeners.map(listener => new Promise(resolve => listener.close(resolve))));
  await rm(profile, { recursive: true, force: true });
}
