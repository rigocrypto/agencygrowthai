import { defineConfig } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';

function readEnv(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const values: Record<string, string> = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    let value = match[2];
    if (value.length > 1 && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))) value = value.slice(1, -1);
    values[match[1]] = value;
  }
  return values;
}

const testEnv = readEnv('.env.test.local');
const publicEnv = readEnv('.env.local');
const serverEnv = readEnv('.env');
for (const key of ['TENANT_TEST_A_EMAIL', 'TENANT_TEST_A_PASSWORD', 'TENANT_TEST_B_EMAIL', 'TENANT_TEST_B_PASSWORD']) process.env[key] = testEnv[key];
process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN = publicEnv.NEXT_PUBLIC_NHOST_SUBDOMAIN;
process.env.NEXT_PUBLIC_NHOST_REGION = publicEnv.NEXT_PUBLIC_NHOST_REGION;
process.env.HASURA_ADMIN_SECRET = serverEnv.HASURA_ADMIN_SECRET ?? serverEnv.HASURA_GRAPHQL_ADMIN_SECRET ?? serverEnv.NHOST_ADMIN_SECRET;

export default defineConfig({
  testDir: './tests-nhost',
  testMatch: 'phase3c-pilot.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  reporter: 'list',
  use: {
    baseURL: 'https://agencygrowthai.netlify.app',
    browserName: 'chromium',
    channel: 'chrome',
    headless: true,
    // Auth requests carry test credentials. Failure traces/screenshots must not persist them.
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
});
