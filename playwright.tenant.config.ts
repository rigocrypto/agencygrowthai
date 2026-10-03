import { existsSync, readFileSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

/*
Tenant isolation runs against a real Supabase project over HTTP. No app server is started
— the point is to test the database boundary, not the UI.

  npx playwright test --config=playwright.tenant.config.ts

Requires a seeded project; see supabase/seed/README.md.
*/

// Minimal .env loader so this config needs no extra dependency.
function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!match) continue;
    const value = match[2].trim().replace(/^["'](.*)["']$/, '$1');
    process.env[match[1]] = value;
  }
}

loadEnvFile('.env');
loadEnvFile('.env.test.local'); // credentials for the two fixture users; not committed

export default defineConfig({
  testDir: './tests-tenant',
  retries: 0,
  reporter: 'list',
  workers: 1,
  use: {
    extraHTTPHeaders: { Accept: 'application/json' },
  },
  // The public funnel now writes through the app's own server route, so the app has to be
  // running. Everything else in the suite talks straight to PostgREST.
  webServer: {
    command: 'npm run start -- --hostname 127.0.0.1 --port 3100',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
