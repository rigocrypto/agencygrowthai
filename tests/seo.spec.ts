import { expect, test, type Page } from '@playwright/test';

// Public routes, as declared by app/sitemap.ts.
const PUBLIC_ROUTES = ['/', '/financial-checkup', '/career', '/privacy', '/terms', '/disclaimers'];

type Seo = {
  title: string;
  description: string | null;
  canonical: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  twitterCard: string | null;
  h1Count: number;
  h1: string | null;
};

// Read the whole head in one pass. Using locator.getAttribute() per tag would block for
// the full locator timeout on every tag that is absent, which is exactly the case here.
async function readSeo(page: Page, route: string): Promise<Seo> {
  await page.goto(route);
  return page.evaluate(() => {
    const meta = (selector: string) =>
      document.head.querySelector<HTMLMetaElement>(selector)?.content ?? null;
    const h1s = document.querySelectorAll('h1');
    return {
      title: document.title,
      description: meta('meta[name="description"]'),
      canonical: document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href ?? null,
      ogTitle: meta('meta[property="og:title"]'),
      ogDescription: meta('meta[property="og:description"]'),
      twitterCard: meta('meta[name="twitter:card"]'),
      h1Count: h1s.length,
      h1: h1s[0]?.textContent ?? null,
    };
  });
}

for (const route of PUBLIC_ROUTES) {
  test(`${route} exposes complete SEO metadata`, async ({ page }) => {
    const seo = await readSeo(page, route);

    expect.soft(seo.title, `${route}: missing <title>`).toBeTruthy();
    expect.soft(seo.description, `${route}: missing meta description`).toBeTruthy();
    expect.soft(seo.canonical, `${route}: missing <link rel="canonical">`).toBeTruthy();
    expect.soft(seo.ogTitle, `${route}: missing og:title`).toBeTruthy();
    expect.soft(seo.ogDescription, `${route}: missing og:description`).toBeTruthy();
    expect.soft(seo.twitterCard, `${route}: missing twitter:card`).toBeTruthy();
    expect.soft(seo.h1Count, `${route}: expected exactly one <h1>, found ${seo.h1Count}`).toBe(1);
  });
}

test('public routes do not share duplicate titles', async ({ page }) => {
  const byTitle = new Map<string, string[]>();
  for (const route of PUBLIC_ROUTES) {
    const { title } = await readSeo(page, route);
    byTitle.set(title, [...(byTitle.get(title) ?? []), route]);
  }
  const duplicates: string[] = [];
  byTitle.forEach((routes, title) => {
    if (routes.length > 1) duplicates.push(`"${title}" shared by ${routes.join(', ')}`);
  });

  expect(duplicates, `duplicate titles found:\n${duplicates.join('\n')}`).toEqual([]);
});

test('sitemap.xml lists the public routes and hides private ones', async ({ request }) => {
  const res = await request.get('/sitemap.xml');
  expect(res.status()).toBe(200);
  const xml = await res.text();
  for (const route of PUBLIC_ROUTES.filter((r) => r !== '/')) {
    expect(xml, `sitemap must list ${route}`).toContain(route);
  }
  expect(xml, 'sitemap must not expose /dashboard').not.toContain('/dashboard');
  expect(xml, 'sitemap must not expose /login').not.toContain('/login');
});

test('robots.txt disallows private areas and points at the sitemap', async ({ request }) => {
  const res = await request.get('/robots.txt');
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).toContain('/dashboard');
  expect(body).toContain('/login');
  expect(body.toLowerCase()).toContain('sitemap');
});
