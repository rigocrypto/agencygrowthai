import { expect, test } from '@playwright/test';

// Core Web Vitals are only meaningful against a production build, so this suite has its
// own config (playwright.perf.config.ts) that serves `next start`. Running it against
// `next dev` would measure the dev compiler, not the product.

const ROUTES = ['/', '/financial-checkup', '/career'];

// Google's "good" thresholds.
const LCP_GOOD_MS = 2500;
const CLS_GOOD = 0.1;
const TTFB_GOOD_MS = 800;

type Vitals = { lcp: number; cls: number; ttfb: number; domContentLoaded: number; transferKb: number };

for (const route of ROUTES) {
  test(`${route} meets Core Web Vitals thresholds`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'load' });

    // Give layout shifts and late LCP candidates a chance to register.
    await page.waitForLoadState('networkidle');

    const vitals = await page.evaluate<Vitals>(() => {
      return new Promise((resolve) => {
        let lcp = 0;
        let cls = 0;

        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) lcp = Math.max(lcp, entry.startTime);
        }).observe({ type: 'largest-contentful-paint', buffered: true });

        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const shift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
            if (!shift.hadRecentInput) cls += shift.value;
          }
        }).observe({ type: 'layout-shift', buffered: true });

        const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        const transferKb =
          Math.round(
            (nav.transferSize + resources.reduce((sum, r) => sum + (r.transferSize || 0), 0)) / 102.4
          ) / 10;

        // Let the observers flush before reading.
        setTimeout(
          () =>
            resolve({
              lcp: Math.round(lcp),
              cls: Math.round(cls * 1000) / 1000,
              ttfb: Math.round(nav.responseStart - nav.requestStart),
              domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
              transferKb,
            }),
          500
        );
      });
    });

    console.log(`VITALS ${route}`, JSON.stringify(vitals));

    expect.soft(vitals.lcp, `${route}: LCP ${vitals.lcp}ms exceeds ${LCP_GOOD_MS}ms`).toBeLessThanOrEqual(LCP_GOOD_MS);
    expect.soft(vitals.cls, `${route}: CLS ${vitals.cls} exceeds ${CLS_GOOD}`).toBeLessThanOrEqual(CLS_GOOD);
    expect
      .soft(vitals.ttfb, `${route}: TTFB ${vitals.ttfb}ms exceeds ${TTFB_GOOD_MS}ms`)
      .toBeLessThanOrEqual(TTFB_GOOD_MS);
  });
}
