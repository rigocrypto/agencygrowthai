import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const ROUTES = [
  '/',
  '/financial-checkup',
  '/career',
  '/privacy',
  '/terms',
  '/disclaimers',
  '/login',
  '/dashboard',
  '/dashboard/leads',
  '/dashboard/appointments',
  '/dashboard/recruiting',
];

for (const route of ROUTES) {
  test(`${route} has no serious or critical axe violations`, async ({ page }) => {
    await page.goto(route);
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const blocking = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');

    const detail = blocking.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.slice(0, 3).map((n) => n.target.join(' ')),
    }));

    expect(detail, `axe violations on ${route}: ${JSON.stringify(detail, null, 2)}`).toEqual([]);
  });
}
