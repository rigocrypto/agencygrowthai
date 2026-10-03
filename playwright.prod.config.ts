import { defineConfig } from '@playwright/test';

// Same functional suite as playwright.config.ts, but served from a production build.
// `next dev` compiles each route on first request, which makes a suite this size race
// against the compiler. Run with:
//   npx next build && npx playwright test --config=playwright.prod.config.ts
export default defineConfig({
  testDir: './tests',
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3100',
    browserName: 'chromium',
    channel: 'chrome',
    headless: true,
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run start -- --hostname 127.0.0.1 --port 3100',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: false,
    timeout: 120000,
  },
});
