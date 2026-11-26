import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
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

try {
  // 1. Fresh launch: offline setup WITHOUT remember-me, onboard sample pantry, add shopping item, verify 403 desktop guard.
  let desktop = await launch();
  try {
    assert.equal(await desktop.evaluate(({ app }) => app.getName()), 'Pantry & Plate');
    const page = await desktop.firstWindow();
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
    await expect(page.locator('main img').first()).toBeVisible();
    await expect.poll(async () => page.locator('main img').first().evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
    await page.getByRole('button', { name: 'Add missing ingredients to list', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Shopping list', exact: true })).toBeVisible();

    const { origin } = new URL(page.url());
    assert.match(origin, /^http:\/\/127\.0\.0\.1:\d+$/);
    const unauthenticated = await fetch(`${origin}/api/snapshot`);
    assert.equal(unauthenticated.status, 403);
    await unauthenticated.body?.cancel();
  } finally {
    await desktop.close();
  }

  // Trigger a simulated catalog upgrade so we also verify automatic pre-upgrade backup.
  const db = openDatabase(join(profile, 'pantry.sqlite'));
  try {
    db.prepare('UPDATE catalog_metadata SET version=? WHERE id=1').run('previous-catalog-for-smoke-test');
  } finally {
    db.close();
  }

  // 2. Restart WITHOUT remember-me -> must land on Sign-In; then sign in WITH remember-me checked.
  desktop = await launch();
  try {
    const page = await desktop.firstWindow();
    await expect(page.getByRole('heading', { name: 'Sign in to continue', exact: true })).toBeVisible();
    await page.getByLabel('Username', { exact: true }).fill('smokeuser');
    await page.locator('#auth-password').fill('smoke-pass-123');
    await page.getByLabel(/Remember sign-in/).check();
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();

    await page.getByRole('link', { name: 'Shopping list', exact: true }).click();
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
  } finally {
    await desktop.close();
  }

  // 3. Restart WITH remember-me active -> auto-signs in via OS-protected credential store, then explicit Sign out.
  desktop = await launch();
  try {
    const page = await desktop.firstWindow();
    await expect(page.getByRole('link', { name: 'Shopping list', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Sign in to continue', exact: true })).toBeVisible();
  } finally {
    await desktop.close();
  }

  // 4. Restart after Sign out -> must NOT auto-sign in.
  desktop = await launch();
  try {
    const page = await desktop.firstWindow();
    await expect(page.getByRole('heading', { name: 'Sign in to continue', exact: true })).toBeVisible();
  } finally {
    await desktop.close();
  }

  console.log('Desktop smoke passed: offline setup, auth guard, remember-me auto-sign-in, sign-out lock, catalog upgrade backup and persistence.');
} finally {
  await rm(profile, { recursive: true, force: true });
}
