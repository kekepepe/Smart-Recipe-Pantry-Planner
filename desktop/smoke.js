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
const launch = () => _electron.launch({ executablePath: resolve(executable), args: [`--user-data-dir=${profile}`] });

try {
  let desktop = await launch();
  try {
    assert.equal(await desktop.evaluate(({ app }) => app.getName()), 'Pantry & Plate');
    const page = await desktop.firstWindow();
    await page.getByRole('button', { name: 'Use sample pantry', exact: true }).click();
    const recipe = page.getByRole('link', { name: 'View recipe: Tomato & egg stir-fry', exact: true });
    await recipe.click();
    await expect(page.getByRole('heading', { name: 'Tomato & egg stir-fry', exact: true })).toBeVisible();
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

  const db = openDatabase(join(profile, 'pantry.sqlite'));
  try {
    db.prepare('UPDATE catalog_metadata SET version=? WHERE id=1').run('previous-catalog-for-smoke-test');
  } finally {
    db.close();
  }

  desktop = await launch();
  try {
    const page = await desktop.firstWindow();
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

  console.log('Desktop smoke passed: clean initialization, local image, shopping selection, catalog upgrade backup and restart persistence.');
} finally {
  await rm(profile, { recursive: true, force: true });
}
