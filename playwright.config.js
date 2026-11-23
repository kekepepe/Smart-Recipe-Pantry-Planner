import { defineConfig } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
export default defineConfig({
  outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR || join(tmpdir(), 'pantry-plate-e2e'),
  testDir: './tests/e2e', workers: 1, retries: 0, timeout: 30000,
  use: { browserName: 'chromium', viewport: { width: 1440, height: 1000 }, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  reporter: 'list',
});
