import { expect, test, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';

const subdomain = process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN ?? '';
const region = process.env.NEXT_PUBLIC_NHOST_REGION ?? '';
const adminSecret = process.env.HASURA_ADMIN_SECRET ?? '';
const hasuraUrl = `https://${subdomain}.hasura.${region}.nhost.run`;
const fixtureIds = Object.fromEntries(['campaigns','leads','appointments','candidates','content_assets'].map((table) => [table, [randomUUID(), randomUUID()]])) as Record<string, string[]>;

const credentials = {
  a: { email: process.env.TENANT_TEST_A_EMAIL ?? '', password: process.env.TENANT_TEST_A_PASSWORD ?? '' },
  b: { email: process.env.TENANT_TEST_B_EMAIL ?? '', password: process.env.TENANT_TEST_B_PASSWORD ?? '' },
};

async function login(page: Page, tenant: keyof typeof credentials) {
  const credential = credentials[tenant];
  expect(credential.email, `Tenant ${tenant.toUpperCase()} email must be present`).not.toBe('');
  expect(credential.password, `Tenant ${tenant.toUpperCase()} password must be present`).not.toBe('');
  await page.goto('/login');
  await page.getByLabel('Email').fill(credential.email);
  await page.getByLabel('Password').fill(credential.password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  try {
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 60_000 });
  } catch {
    const safeMessages = await page.locator('[data-sonner-toast]').allTextContents();
    throw new Error(`Tenant ${tenant.toUpperCase()} application login failed: ${safeMessages.join(' | ') || 'no safe UI error returned'}`);
  }
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
}

async function logout(page: Page) {
  await page.getByRole('button', { name: 'Sign Out' }).click();
  await expect(page).toHaveURL(/\/login$/);
}

async function sql(statement: string, readOnly = true) {
  const response = await fetch(`${hasuraUrl}/v2/query`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-hasura-admin-secret': adminSecret },
    body: JSON.stringify({ type: 'run_sql', args: { source: 'default', sql: statement, read_only: readOnly, cascade: false } }),
  });
  expect(response.status).toBe(200);
  return response.json();
}

async function createFixtures() {
  const identities = await sql("SELECT a.id::text, g.id::text FROM public.agencies a JOIN public.agents g ON g.agency_id=a.id WHERE a.public_slug IN ('phase2b-a','phase2b-b') ORDER BY a.public_slug;");
  const rows = identities.result.slice(1) as string[][];
  expect(rows).toHaveLength(2);
  const [agencyA, agentA] = rows[0];
  const [agencyB, agentB] = rows[1];
  await sql(`BEGIN;
    INSERT INTO public.campaigns(id,agency_id,name,platform) VALUES ('${fixtureIds.campaigns[0]}','${agencyA}','Campaign A','direct'),('${fixtureIds.campaigns[1]}','${agencyB}','Campaign B','direct');
    INSERT INTO public.leads(id,agency_id,first_name,last_name,email,campaign_id,assigned_agent_id) VALUES ('${fixtureIds.leads[0]}','${agencyA}','Lead','Alpha','phase3a-a@example.invalid','${fixtureIds.campaigns[0]}','${agentA}'),('${fixtureIds.leads[1]}','${agencyB}','Lead','Beta','phase3a-b@example.invalid','${fixtureIds.campaigns[1]}','${agentB}');
    INSERT INTO public.appointments(id,agency_id,lead_id,agent_id,date,time) VALUES ('${fixtureIds.appointments[0]}','${agencyA}','${fixtureIds.leads[0]}','${agentA}','2099-03-01','09:00'),('${fixtureIds.appointments[1]}','${agencyB}','${fixtureIds.leads[1]}','${agentB}','2099-03-02','10:00');
    INSERT INTO public.candidates(id,agency_id,first_name,last_name,email,assigned_agent_id) VALUES ('${fixtureIds.candidates[0]}','${agencyA}','Candidate','Alpha','phase3a-ca@example.invalid','${agentA}'),('${fixtureIds.candidates[1]}','${agencyB}','Candidate','Beta','phase3a-cb@example.invalid','${agentB}');
    INSERT INTO public.content_assets(id,agency_id,title,type,content,created_by) VALUES ('${fixtureIds.content_assets[0]}','${agencyA}','Asset A','social_post','Phase3A','${agentA}'),('${fixtureIds.content_assets[1]}','${agencyB}','Asset B','social_post','Phase3A','${agentB}');
    COMMIT;`, false);
}

async function cleanFixtures() {
  // The marker cleanup is intentionally idempotent. If Hasura commits a cleanup
  // but the client times out before receiving the response, retrying cannot
  // remove anything outside this suite's synthetic provenance boundary.
  const cleanup = `BEGIN;
    DELETE FROM public.appointments
      WHERE lead_id IN (
        SELECT id FROM public.leads
        WHERE email IN ('phase3a-a@example.invalid','phase3a-b@example.invalid')
      );
    DELETE FROM public.content_assets
      WHERE content = 'Phase3A'
        AND title IN ('Asset A','Asset B')
        AND agency_id IN (
          SELECT id FROM public.agencies WHERE public_slug IN ('phase2b-a','phase2b-b')
        );
    DELETE FROM public.candidates
      WHERE email IN ('phase3a-ca@example.invalid','phase3a-cb@example.invalid')
        AND agency_id IN (
          SELECT id FROM public.agencies WHERE public_slug IN ('phase2b-a','phase2b-b')
        );
    DELETE FROM public.leads
      WHERE email IN ('phase3a-a@example.invalid','phase3a-b@example.invalid')
        AND agency_id IN (
          SELECT id FROM public.agencies WHERE public_slug IN ('phase2b-a','phase2b-b')
        );
    DELETE FROM public.campaigns
      WHERE name IN ('Campaign A','Campaign B')
        AND platform = 'direct'
        AND agency_id IN (
          SELECT id FROM public.agencies WHERE public_slug IN ('phase2b-a','phase2b-b')
        );
    COMMIT;`;

  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await sql(cleanup, false);
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function verifyTenantPages(page: Page, own: 'Alpha' | 'Beta', foreign: 'Alpha' | 'Beta') {
  const checks = [
    ['/dashboard/leads', `Lead ${own}`, `Lead ${foreign}`],
    ['/dashboard/agents', `Agent ${own}`, `Agent ${foreign}`],
    ['/dashboard/appointments', `Lead ${own}`, `Lead ${foreign}`],
    ['/dashboard/recruiting', `Candidate ${own}`, `Candidate ${foreign}`],
    ['/dashboard/campaigns', `Campaign ${own.charAt(0)}`, `Campaign ${foreign.charAt(0)}`],
    ['/dashboard/content', `Asset ${own.charAt(0)}`, `Asset ${foreign.charAt(0)}`],
  ] as const;

  for (const [route, ownText, foreignText] of checks) {
    await page.goto(route);
    await expect(page.getByText(ownText, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(foreignText, { exact: true })).toHaveCount(0);
  }
}

test.describe.serial('Phase 3A real Nhost application boundary', () => {
  test.beforeAll(async () => {
    expect(subdomain).not.toBe('');
    expect(region).not.toBe('');
    expect(adminSecret).not.toBe('');
    await cleanFixtures();
    await createFixtures();
  });

  test.afterAll(async () => {
    await cleanFixtures();
    const counts = await sql("SELECT (SELECT count(*) FROM public.leads)::text,(SELECT count(*) FROM public.appointments)::text,(SELECT count(*) FROM public.candidates)::text,(SELECT count(*) FROM public.campaigns)::text,(SELECT count(*) FROM public.content_assets)::text;");
    expect(counts.result[1]).toEqual(['0','0','0','0','0']);
    console.log('PHASE3A_REMOTE_TEST_FIXTURES=CLEANED');
  });
  test('anonymous users cannot mount the dashboard while the public site remains available', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login$/);
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.evaluate(() => localStorage.setItem('nhostSession', JSON.stringify({ accessToken: 'invalid-session' })));
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText('Lead Alpha')).toHaveCount(0);
  });

  test('real User A session restores and exposes only tenant A', async ({ page }) => {
    await login(page, 'a');
    await expect(page.getByText('Security Agency A').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Security Agency B')).toHaveCount(0);
    await expect(page.getByText('Total Leads', { exact: true }).locator('..').getByText('1', { exact: true })).toBeVisible();
    await verifyTenantPages(page, 'Alpha', 'Beta');
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard\/content$/);
    await expect(page.getByText('Asset A', { exact: true })).toBeVisible();
    await logout(page);
  });

  test('session switch A to B is clean and known foreign IDs remain invisible', async ({ page }) => {
    await login(page, 'a');
    await page.goto('/dashboard/leads');
    const leadAHref = await page.getByRole('link', { name: 'View Lead Alpha' }).getAttribute('href');
    expect(leadAHref).toBeTruthy();
    await logout(page);

    await login(page, 'b');
    await expect(page.getByText('Security Agency B').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Security Agency A')).toHaveCount(0);
    await expect(page.getByText('Total Leads', { exact: true }).locator('..').getByText('1', { exact: true })).toBeVisible();
    await verifyTenantPages(page, 'Beta', 'Alpha');
    await page.goto(leadAHref!);
    await expect(page.getByRole('heading', { name: 'Lead Not Found' })).toBeVisible();

    await page.goto('/dashboard/leads');
    const leadBHref = await page.getByRole('link', { name: 'View Lead Beta' }).getAttribute('href');
    expect(leadBHref).toBeTruthy();
    await logout(page);

    await login(page, 'a');
    await page.goto(leadBHref!);
    await expect(page.getByRole('heading', { name: 'Lead Not Found' })).toBeVisible();
    await logout(page);
    await page.goto('/dashboard/leads');
    await expect(page).toHaveURL(/\/login$/);
  });
});
