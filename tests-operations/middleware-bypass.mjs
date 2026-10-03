import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = (process.env.SECURITY_TEST_BASE_URL ?? 'http://127.0.0.1:3100').replace(/\/$/, '');
const variants = [
  'middleware:middleware:middleware:middleware:middleware',
  'src/middleware:src/middleware:src/middleware:src/middleware:src/middleware',
];

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const value of variants) {
    const context = await browser.newContext({
      extraHTTPHeaders: { 'x-middleware-subrequest': value },
    });
    try {
      const page = await context.newPage();
      await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'domcontentloaded' });
      await page.waitForURL(/\/login(?:[/?#]|$)/, { timeout: 30_000 });
      assert.match(page.url(), /\/login(?:[/?#]|$)/, 'Spoofed middleware header bypassed dashboard redirect');
      const body = await page.locator('body').innerText();
      assert.doesNotMatch(body, /Total Leads|Recent Leads|Pipeline Overview/i, 'Protected dashboard content was exposed');
    } finally {
      await context.close();
    }
  }
  console.log(`MIDDLEWARE_SUBREQUEST_VARIANTS=${variants.length}`);
  console.log('PROTECTED_DASHBOARD=VERIFIED');
  console.log('AUTHORIZATION_BYPASS=BLOCKED');
} finally {
  await browser.close();
}
