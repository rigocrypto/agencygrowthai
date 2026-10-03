import { expect, test } from '@playwright/test';

// Every route under /dashboard is meant to be agency-private. These tests document what
// an unauthenticated visitor can currently reach. They are expected to FAIL until a
// route guard exists — that failure is the finding, not a flake.
const PRIVATE_ROUTES = [
  '/dashboard',
  '/dashboard/leads',
  '/dashboard/appointments',
  '/dashboard/recruiting',
  '/dashboard/agents',
  '/dashboard/campaigns',
  '/dashboard/analytics',
  '/dashboard/compliance',
  '/dashboard/content',
  '/dashboard/ai-assistant',
  '/dashboard/settings',
];

for (const route of PRIVATE_ROUTES) {
  test(`${route} redirects an unauthenticated visitor to /login`, async ({ page }) => {
    await page.context().clearCookies();
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/login/);
  });
}
