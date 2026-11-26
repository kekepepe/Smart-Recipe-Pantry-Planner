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
const launch = () => _electron.launch({ executablePath: resolve(executable), args: [`--user-data-dir=${profile}`] });
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
  let desktop = await launch();
  try {
    assert.equal(await desktop.evaluate(({ app }) => app.getName()), 'Pantry & Plate');
    const page = await desktop.firstWindow();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
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

  desktop = await launch();
  try {
    const page = await desktop.firstWindow();
    chineseOrigin = new URL(page.url()).origin;
    assert.notEqual(chineseOrigin, englishOrigin);
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
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

  desktop = await launch();
  try {
    const page = await desktop.firstWindow();
    const origin = new URL(page.url()).origin;
    assert.notEqual(origin, chineseOrigin);
    assert.notEqual(origin, englishOrigin);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await page.getByRole('link', { name: 'Shopping list', exact: true }).click();
    await expect(page.getByRole('list', { name: 'Purchased ingredients', exact: true }).getByRole('checkbox', { name: 'Tomatoes', exact: true })).toBeChecked();
  } finally {
    await desktop.close();
  }

  console.log('Desktop smoke passed: clean initialization, local image, catalog upgrade backup, and language, pantry and shopping persistence across new ports.');
} finally {
  await Promise.all(previousListeners.map(listener => new Promise(resolve => listener.close(resolve))));
  await rm(profile, { recursive: true, force: true });
}
