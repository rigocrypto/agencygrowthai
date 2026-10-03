import { defineConfig } from '@playwright/test';

// Core Web Vitals must be measured against a production build. Run with:
//   npx next build && npx playwright test --config=playwright.perf.config.ts
export default defineConfig({
  testDir: './tests-perf',
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3100',
    browserName: 'chromium',
    channel: 'chrome',
    headless: true,
  },
  webServer: {
    command: 'npm run start -- --hostname 127.0.0.1 --port 3100',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: false,
    timeout: 120000,
  },
});
