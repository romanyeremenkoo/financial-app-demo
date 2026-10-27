import { defineConfig, devices } from '@playwright/test';
import { QA_ATTRIBUTE } from './e2e/qa';

const PORT = 5273;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e/playwright',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: process.env['CI'] ? 'list' : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    // Every locator in the suite resolves through this attribute only.
    testIdAttribute: QA_ATTRIBUTE,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run serve:e2e',
    url: BASE_URL,
    reuseExistingServer: !process.env['CI'],
    timeout: 180_000,
  },
});
