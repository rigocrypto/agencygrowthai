import { defineConfig } from '@playwright/test';
import { readFileSync } from 'node:fs';

function readEnv(path: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    let value = match[2];
    if (value.length > 1 && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }
  return values;
}

const testEnv = readEnv('.env.test.local');
const publicEnv = readEnv('.env.local');
const serverEnv = readEnv('.env');
for (const key of ['TENANT_TEST_A_EMAIL', 'TENANT_TEST_A_PASSWORD', 'TENANT_TEST_B_EMAIL', 'TENANT_TEST_B_PASSWORD']) {
  process.env[key] = testEnv[key];
}
process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN = publicEnv.NEXT_PUBLIC_NHOST_SUBDOMAIN;
process.env.NEXT_PUBLIC_NHOST_REGION = publicEnv.NEXT_PUBLIC_NHOST_REGION;
process.env.HASURA_ADMIN_SECRET = serverEnv.HASURA_ADMIN_SECRET ?? serverEnv.HASURA_GRAPHQL_ADMIN_SECRET ?? serverEnv.NHOST_ADMIN_SECRET;

export default defineConfig({
  testDir: './tests-nhost',
  testMatch: 'phase3a-application.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3103',
    browserName: 'chromium',
    channel: 'chrome',
    headless: true,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  webServer: {
    command: 'npm run dev -- --hostname 127.0.0.1 --port 3103',
    url: 'http://127.0.0.1:3103',
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      NEXT_PUBLIC_DATA_MODE: 'nhost',
      NEXT_PUBLIC_NHOST_SUBDOMAIN: publicEnv.NEXT_PUBLIC_NHOST_SUBDOMAIN,
      NEXT_PUBLIC_NHOST_REGION: publicEnv.NEXT_PUBLIC_NHOST_REGION,
      HASURA_ADMIN_SECRET: serverEnv.HASURA_ADMIN_SECRET ?? serverEnv.HASURA_GRAPHQL_ADMIN_SECRET ?? serverEnv.NHOST_ADMIN_SECRET,
      TENANT_TEST_A_EMAIL: testEnv.TENANT_TEST_A_EMAIL,
      TENANT_TEST_A_PASSWORD: testEnv.TENANT_TEST_A_PASSWORD,
      TENANT_TEST_B_EMAIL: testEnv.TENANT_TEST_B_EMAIL,
      TENANT_TEST_B_PASSWORD: testEnv.TENANT_TEST_B_PASSWORD,
    },
  },
});
