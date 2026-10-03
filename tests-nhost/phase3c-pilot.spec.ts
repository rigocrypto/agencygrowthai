import { createHash, randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';

const subdomain = process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN ?? '';
const region = process.env.NEXT_PUBLIC_NHOST_REGION ?? '';
const hasuraUrl = `https://${subdomain}.hasura.${region}.nhost.run`;
const authUrl = `https://${subdomain}.auth.${region}.nhost.run/v1`;
const adminSecret = process.env.HASURA_ADMIN_SECRET ?? '';
const credential = {
  a: { email: process.env.TENANT_TEST_A_EMAIL ?? '', password: process.env.TENANT_TEST_A_PASSWORD ?? '' },
  b: { email: process.env.TENANT_TEST_B_EMAIL ?? '', password: process.env.TENANT_TEST_B_PASSWORD ?? '' },
};
const leadEmail = 'phase3c-pilot@example.invalid';
const idempotencyEmail = 'phase3c-idempotency@example.invalid';
const candidateEmail = 'phase3c-candidate@example.invalid';

type Session = { accessToken: string; refreshToken?: string; user: { id: string; emailVerified?: boolean } };
let sessionA: Session;
let sessionB: Session;
let agencyA = '';
let agencyB = '';
let leadId = '';
let appointmentId = '';
let candidateId = '';
let metadataHash = '';

async function jsonFetch(url: string, init: RequestInit) {
  const response = await fetch(url, init);
  const text = await response.text();
  let body: any;
  try { body = text ? JSON.parse(text) : null; } catch { body = null; }
  return { status: response.status, body, text };
}

async function authLogin(email: string, password: string): Promise<Session> {
  const response = await jsonFetch(`${authUrl}/signin/email-password`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }),
  });
  expect(response.status).toBe(200);
  expect(response.body?.session?.accessToken).toBeTruthy();
  expect(response.body?.session?.user?.id).toBeTruthy();
  return response.body.session as Session;
}

function hasuraClaims(session: Session): Record<string, string | string[]> {
  const payload = JSON.parse(Buffer.from(session.accessToken.split('.')[1], 'base64url').toString('utf8'));
  return payload['https://hasura.io/jwt/claims'] ?? payload['https://hasura.io/jwt/claims'.replace('https://', '')] ?? {};
}

async function graphql(query: string, variables: Record<string, unknown> = {}, token?: string, extra: Record<string, string> = {}) {
  return jsonFetch(`${hasuraUrl}/v1/graphql`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...extra },
    body: JSON.stringify({ query, variables }),
  });
}

async function sql(statement: string, readOnly = true) {
  return jsonFetch(`${hasuraUrl}/v2/query`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-hasura-admin-secret': adminSecret },
    body: JSON.stringify({ type: 'run_sql', args: { source: 'default', sql: statement, read_only: readOnly, cascade: false } }),
  });
}

async function metadata(body: unknown) {
  return jsonFetch(`${hasuraUrl}/v1/metadata`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-hasura-admin-secret': adminSecret }, body: JSON.stringify(body),
  });
}

async function cleanup() {
  const statement = `BEGIN;
    DELETE FROM public.appointments WHERE lead_id IN (SELECT id FROM public.leads WHERE email IN ('${leadEmail}','${idempotencyEmail}'));
    DELETE FROM public.candidates WHERE email='${candidateEmail}';
    DELETE FROM public.leads WHERE email IN ('${leadEmail}','${idempotencyEmail}');
    COMMIT;`;
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const result = await sql(statement, false);
      expect(result.status).toBe(200);
      return;
    } catch (error) { last = error; }
  }
  throw last;
}

async function counts() {
  const result = await sql(`SELECT
    (SELECT count(*) FROM public.leads)::text,
    (SELECT count(*) FROM public.appointments)::text,
    (SELECT count(*) FROM public.candidates)::text,
    (SELECT count(*) FROM public.consents)::text;`);
  expect(result.status).toBe(200);
  return result.body.result[1] as string[];
}

async function browserLogin(page: Page, tenant: 'a' | 'b') {
  await page.goto('/login');
  await expect(page.getByText('DEMO MODE')).toHaveCount(0);
  await page.getByLabel('Email').fill(credential[tenant].email);
  await page.getByLabel('Password').fill(credential[tenant].password);
  const authResponse = page.waitForResponse((response) => response.url().includes('/signin/email-password') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  const response = await authResponse;
  if (page.url().endsWith('/login')) {
    await page.getByLabel('Email').fill('');
    await page.getByLabel('Password').fill('');
  }
  expect(response.status()).toBe(200);
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 60_000 });
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
}

async function browserLogout(page: Page) {
  await page.getByRole('button', { name: 'Sign Out', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
}

test.describe.serial('Phase 3C deployed one-agent pilot', () => {
  test.beforeAll(async () => {
    for (const value of [subdomain, region, adminSecret, credential.a.email, credential.a.password, credential.b.email, credential.b.password]) expect(value).not.toBe('');
    await cleanup();
    expect(await counts()).toEqual(['0', '0', '0', '0']);
    const agencies = await sql("SELECT id::text, public_slug FROM public.agencies WHERE public_slug IN ('phase2b-a','phase2b-b') ORDER BY public_slug;");
    expect(agencies.status).toBe(200);
    agencyA = agencies.body.result[1][0];
    agencyB = agencies.body.result[2][0];
    const exported = await metadata({ type: 'export_metadata', args: {} });
    expect(exported.status).toBe(200);
    metadataHash = createHash('sha256').update(exported.text).digest('hex').toUpperCase();

    sessionA = await authLogin(credential.a.email, credential.a.password);
    sessionB = await authLogin(credential.b.email, credential.b.password);
    expect(sessionA.user.id).not.toBe(sessionB.user.id);
    expect(sessionA.user.emailVerified).toBe(true);
    expect(sessionB.user.emailVerified).toBe(true);
    const claimsA = hasuraClaims(sessionA);
    const claimsB = hasuraClaims(sessionB);
    expect(claimsA['x-hasura-user-id']).toBe(sessionA.user.id);
    expect(claimsB['x-hasura-user-id']).toBe(sessionB.user.id);
    expect(claimsA['x-hasura-default-role']).toBe('user');
    expect(claimsB['x-hasura-default-role']).toBe('user');
  });

  test.afterAll(async () => {
    await cleanup();
    expect(await counts()).toEqual(['0', '0', '0', '0']);
    const consistency = await metadata({ type: 'get_inconsistent_metadata', args: {} });
    expect(consistency.status).toBe(200);
    expect(consistency.body.is_consistent).toBe(true);
    expect(consistency.body.inconsistent_objects ?? []).toHaveLength(0);
    const exported = await metadata({ type: 'export_metadata', args: {} });
    const finalHash = createHash('sha256').update(exported.text).digest('hex').toUpperCase();
    expect(finalHash).toBe(metadataHash);
    console.log(`PHASE3C_METADATA_HASH=${finalHash}`);
    console.log('PHASE3C_FINAL_COUNTS=0,0,0,0');
    console.log('PHASE3C_TEMP_TEST_ROWS=CLEANED');
  });

  test('HTTPS smoke, Nhost mode, and anonymous route protection', async ({ page, request }) => {
    for (const path of ['/', '/login', '/financial-checkup', '/career']) {
      const response = await request.get(path);
      expect(response.status()).toBe(200);
    }
    await page.goto('/login');
    await expect(page.getByText('DEMO MODE')).toHaveCount(0);
    await expect(page.getByLabel('Email')).toBeEnabled();
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('deployed body limit, error contract, and durable idempotency', async ({ request }) => {
    let response = await request.fetch('/api/public/leads', { method: 'POST', headers: { 'content-type': 'application/json' }, data: '{' });
    expect(response.status()).toBe(400);
    expect(Object.keys(await response.json())).toEqual(['error']);
    response = await request.post('/api/public/candidates', { data: {
      agency_slug: 'phase2b-a', idempotency_key: randomUUID(), first_name: 'Phase3C', last_name: 'Oversize',
      email: candidateEmail, phone: '555-300-0001', state: 'FL', current_occupation: 'Test', years_experience: '3-5',
      why_interested: 'x'.repeat(33_000), sales_experience: 'some', financial_services_experience: 'none', preferred_contact: 'email',
    } });
    expect(response.status()).toBe(413);

    const key = randomUUID();
    const payload = {
      agency_slug: 'phase2b-a', idempotency_key: key, first_name: 'Phase3C', last_name: 'Idempotency', email: idempotencyEmail,
      phone: '555-300-0002', consent: true, source: 'phase3c_acceptance', interest: 'Retirement Planning', preferred_contact: 'email',
      checkup_responses: { age_range: '35-44', employment_status: 'full_time', household_income_range: '75k-100k', dependents: '1', retirement_savings_range: 'under_25k', emergency_savings_range: 'under_3_months', life_insurance_status: 'unsure', primary_goal: 'retirement_planning', preferred_contact_method: 'email', consent_to_contact: true },
    };
    const first = await request.post('/api/public/leads', { data: payload });
    const second = await request.post('/api/public/leads', { data: payload });
    expect(first.status()).toBe(201);
    expect(second.status()).toBe(201);
    const firstBody = await first.json();
    const secondBody = await second.json();
    expect(firstBody.id).toBe(secondBody.id);
    const conflict = await request.post('/api/public/leads', { data: { ...payload, first_name: 'Changed' } });
    expect(conflict.status()).toBe(409);
    const proof = await sql(`SELECT count(*)::text FROM public.leads WHERE email='${idempotencyEmail}';`);
    expect(proof.body.result[1][0]).toBe('1');
  });

  test('Financial Checkup creates one server-owned lead and appointment', async ({ page }) => {
    await page.goto('/financial-checkup');
    await page.locator('#first_name').fill('Pilot');
    await page.locator('#last_name').fill('Acceptance');
    await page.locator('#email').fill(leadEmail);
    await page.locator('#phone').fill('(555) 300-0003');
    await page.getByRole('button', { name: /^Continue$/i }).click();
    for (const [index, option] of [[0, '35-44'], [1, 'Full Time'], [2, '75k-100k'], [3, '2']] as const) {
      await page.getByRole('combobox').nth(index).click();
      await page.getByRole('option', { name: option, exact: true }).click();
    }
    await page.getByRole('button', { name: /^Continue$/i }).click();
    for (const [index, option] of [[0, '25k-100k'], [1, '3-6 Months'], [2, 'Employer Only'], [3, 'Retirement Planning'], [4, 'Email']] as const) {
      await page.getByRole('combobox').nth(index).click();
      await page.getByRole('option', { name: option, exact: true }).click();
    }
    await page.getByLabel(/I consent to be contacted about my results/i).check();
    const leadResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/public/leads') && response.request().method() === 'POST');
    await page.getByRole('button', { name: /Get My Snapshot/i }).click();
    const leadResponse = await leadResponsePromise;
    expect(leadResponse.status()).toBe(201);
    const lead = await leadResponse.json();
    leadId = lead.id;
    expect(lead.agency_id).toBe(agencyA);
    expect(lead.consent).toBe(true);
    expect(lead.consent_method).toBe('checkup_form');
    expect(lead.score).toBeGreaterThan(0);
    await expect(page.getByRole('heading', { name: 'Your Financial Health Snapshot', exact: true })).toBeVisible();

    const appointmentResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/public/appointments') && response.request().method() === 'POST');
    await page.getByRole('button', { name: /Schedule a Conversation/i }).click();
    const appointmentResponse = await appointmentResponsePromise;
    expect(appointmentResponse.status()).toBe(201);
    const appointment = await appointmentResponse.json();
    appointmentId = appointment.id;
    expect(appointment.agency_id).toBe(agencyA);
    expect(appointment.lead_id).toBe(leadId);
    expect(appointment.status).toBe('requested');
  });

  test('career form persists a tenant-owned candidate', async ({ page }) => {
    await page.goto('/career');
    await page.locator('#c_first').fill('Pilot');
    await page.locator('#c_last').fill('Candidate');
    await page.locator('#c_email').fill(candidateEmail);
    await page.locator('#c_phone').fill('555-300-0004');
    await page.locator('#c_state').fill('FL');
    await page.locator('#c_occupation').fill('Operations Manager');
    await page.locator('#c_years').click();
    await page.getByRole('option', { name: '3-5 years', exact: true }).click();
    await page.locator('#c_interest').fill('Controlled Phase 3C pilot application for tenant isolation and persistence verification.');
    await page.locator('#c_sales').click();
    await page.getByRole('option', { name: 'Some', exact: true }).click();
    await page.locator('#c_financial').click();
    await page.getByRole('option', { name: 'None', exact: true }).click();
    await page.locator('#c_contact').click();
    await page.getByRole('option', { name: 'Email', exact: true }).click();
    const responsePromise = page.waitForResponse((response) => response.url().endsWith('/api/public/candidates') && response.request().method() === 'POST');
    await page.getByRole('button', { name: /Submit Application/i }).click();
    const response = await responsePromise;
    expect(response.status()).toBe(201);
    const candidate = await response.json();
    candidateId = candidate.id;
    expect(candidate.agency_id).toBe(agencyA);
    expect(candidate.status).toBe('new');
    await expect(page.getByRole('heading', { name: 'Application Received!', exact: true })).toBeVisible();
  });

  test('User A login, restoration, lead updates, appointment update, and logout', async ({ page }) => {
    await browserLogin(page, 'a');
    await expect(page.getByText('Security Agency A').first()).toBeVisible({ timeout: 30_000 });
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText('Security Agency A').first()).toBeVisible();

    await page.goto('/dashboard/leads');
    const leadLink = page.getByRole('link', { name: 'View Pilot Acceptance' });
    await expect(leadLink).toBeVisible();
    await leadLink.click();
    await expect(page.getByRole('heading', { name: 'Pilot Acceptance' })).toBeVisible();
    await expect(page.getByLabel('Assigned agent')).toBeDisabled();
    await page.getByLabel('Lead status').click();
    await page.getByRole('option', { name: 'Qualified', exact: true }).click();
    await expect(page.getByText('Status updated')).toBeVisible();
    await page.getByLabel('Add a note').fill('Phase 3C authenticated pilot note.');
    await page.getByRole('button', { name: 'Add Note', exact: true }).click();
    await expect(page.getByText('Phase 3C authenticated pilot note.')).toBeVisible();
    await page.reload();
    await expect(page.getByText('Phase 3C authenticated pilot note.')).toBeVisible();

    await page.goto('/dashboard/appointments');
    await page.getByLabel('Appointment status for Pilot Acceptance').click();
    await page.getByRole('option', { name: 'Confirmed', exact: true }).click();
    await expect(page.getByText('Appointment status updated')).toBeVisible();
    await page.reload();
    await expect(page.getByLabel('Appointment status for Pilot Acceptance')).toContainText('Confirmed');

    await page.goto('/dashboard/recruiting');
    await page.getByLabel('Candidate status for Pilot Candidate').click();
    await page.getByRole('option', { name: 'Contacted', exact: true }).click();
    await page.reload();
    await expect(page.getByLabel('Candidate status for Pilot Candidate')).toContainText('Contacted');
    await browserLogout(page);
  });

  test('User B has its own session but cannot see or mutate User A pilot rows', async ({ page }) => {
    await browserLogin(page, 'b');
    await expect(page.getByText('Security Agency B').first()).toBeVisible({ timeout: 30_000 });
    await page.goto('/dashboard/leads');
    await expect(page.getByText('Pilot Acceptance')).toHaveCount(0);
    await page.goto(`/dashboard/leads/${leadId}`);
    await expect(page.getByRole('heading', { name: 'Lead Not Found' })).toBeVisible();
    await browserLogout(page);

    const foreign = await graphql('query($lead:uuid!,$candidate:uuid!,$appointment:uuid!){leads_by_pk(id:$lead){id} candidates_by_pk(id:$candidate){id} appointments_by_pk(id:$appointment){id}}', { lead: leadId, candidate: candidateId, appointment: appointmentId }, sessionB.accessToken);
    expect(foreign.body.data).toEqual({ leads_by_pk: null, candidates_by_pk: null, appointments_by_pk: null });
    const update = await graphql('mutation($id:uuid!){update_leads(where:{id:{_eq:$id}},_set:{notes:"forged"}){affected_rows}}', { id: leadId }, sessionB.accessToken);
    expect(update.body.data.update_leads.affected_rows).toBe(0);
  });

  test('deployed GraphQL security blocks direct writes and identity spoofing', async () => {
    const own = await graphql('query($lead:uuid!,$candidate:uuid!,$appointment:uuid!){leads_by_pk(id:$lead){id agency_id status notes} candidates_by_pk(id:$candidate){id agency_id status} appointments_by_pk(id:$appointment){id agency_id status}}', { lead: leadId, candidate: candidateId, appointment: appointmentId }, sessionA.accessToken);
    expect(own.body.data.leads_by_pk).toMatchObject({ id: leadId, agency_id: agencyA, status: 'qualified' });
    expect(own.body.data.leads_by_pk.notes).toContain('Phase 3C authenticated pilot note.');
    expect(own.body.data.candidates_by_pk).toEqual({ id: candidateId, agency_id: agencyA, status: 'contacted' });
    expect(own.body.data.appointments_by_pk).toEqual({ id: appointmentId, agency_id: agencyA, status: 'confirmed' });

    const insert = 'mutation($agency:uuid!){insert_leads_one(object:{agency_id:$agency,first_name:"Forged",last_name:"Insert",email:"forged@example.invalid"}){id}}';
    expect((await graphql(insert, { agency: agencyA })).body?.data?.insert_leads_one).toBeFalsy();
    expect((await graphql(insert, { agency: agencyA }, sessionA.accessToken)).body?.data?.insert_leads_one).toBeFalsy();
    expect((await graphql('mutation($id:uuid!){delete_leads(where:{id:{_eq:$id}}){affected_rows}}', { id: leadId }, sessionA.accessToken)).body?.data?.delete_leads).toBeFalsy();
    expect((await graphql('mutation($agency:uuid!,$user:uuid!){insert_agents_one(object:{agency_id:$agency,user_id:$user,first_name:"Forged",last_name:"Member",email:"forged-member@example.invalid"}){id}}', { agency: agencyA, user: sessionA.user.id }, sessionA.accessToken)).body?.data?.insert_agents_one).toBeFalsy();
    expect((await graphql('mutation($agency:uuid!){insert_audit_logs_one(object:{agency_id:$agency,action:"forged"}){id}}', { agency: agencyA }, sessionA.accessToken)).body?.data?.insert_audit_logs_one).toBeFalsy();
    expect((await graphql('query{agencies{id}}', {}, sessionA.accessToken, { 'x-hasura-role': 'admin' })).body?.data?.agencies).toBeFalsy();
    expect((await graphql('query($id:uuid!){agencies_by_pk(id:$id){id}}', { id: agencyB }, sessionA.accessToken, { 'x-hasura-user-id': sessionB.user.id })).body?.data?.agencies_by_pk).toBeFalsy();
  });
});
