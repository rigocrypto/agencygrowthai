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

type Session = { accessToken: string; user: { id: string } };
let sessionA: Session;
let sessionB: Session;
let metadataHash: string;
let agencyA = '';
let agencyB = '';
let leadB = randomUUID();
let publicLeadId = '';
let publicCandidateId = '';
let publicAppointmentId = '';

const leadPayload = {
  idempotency_key: randomUUID(),
  agency_slug: 'phase2b-a',
  first_name: 'Phase3B',
  last_name: 'Lead',
  email: 'phase3b-lead@example.invalid',
  phone: '555-300-1000',
  consent: true,
  source: 'phase3b_test',
  interest: 'Retirement Planning',
  preferred_contact: 'phone',
  checkup_responses: {
    age_range: '35-44',
    employment_status: 'full_time',
    household_income_range: '75k-100k',
    dependents: '1',
    retirement_savings_range: 'under_25k',
    emergency_savings_range: 'under_3_months',
    life_insurance_status: 'unsure',
    primary_goal: 'retirement_planning',
    preferred_contact_method: 'phone',
    consent_to_contact: true,
  },
};

const candidatePayload = {
  idempotency_key: randomUUID(),
  agency_slug: 'phase2b-a',
  first_name: 'Phase3B',
  last_name: 'Candidate',
  email: 'phase3b-candidate@example.invalid',
  phone: '555-300-2000',
  state: 'FL',
  current_occupation: 'Operations Manager',
  years_experience: '3-5',
  why_interested: 'I want to build a client-focused financial education practice with strong compliance and a long-term commitment to serving families.',
  sales_experience: 'some',
  financial_services_experience: 'some',
  preferred_contact: 'email',
};

async function jsonFetch(url: string, init: RequestInit): Promise<{ status: number; body: any; text: string }> {
  const response = await fetch(url, init);
  const text = await response.text();
  let body: any;
  try { body = text ? JSON.parse(text) : null; } catch { body = null; }
  return { status: response.status, body, text };
}

async function login(email: string, password: string): Promise<Session> {
  const response = await jsonFetch(`${authUrl}/signin/email-password`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }),
  });
  expect(response.status).toBe(200);
  const session = response.body?.session as Session | undefined;
  expect(session?.accessToken).toBeTruthy();
  expect(session?.user?.id).toBeTruthy();
  return session!;
}

async function graphql(query: string, variables: Record<string, unknown> = {}, token?: string, extra: Record<string, string> = {}) {
  return jsonFetch(`${hasuraUrl}/v1/graphql`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...extra },
    body: JSON.stringify({ query, variables }),
  });
}

async function adminMetadata(body: unknown) {
  return jsonFetch(`${hasuraUrl}/v1/metadata`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-hasura-admin-secret': adminSecret }, body: JSON.stringify(body),
  });
}

async function sql(statement: string, readOnly = true) {
  return jsonFetch(`${hasuraUrl}/v2/query`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-hasura-admin-secret': adminSecret },
    body: JSON.stringify({ type: 'run_sql', args: { source: 'default', sql: statement, read_only: readOnly, cascade: false } }),
  });
}

async function cleanup() {
  const result = await sql(`BEGIN;
    DELETE FROM public.candidates WHERE email = 'phase3b-candidate@example.invalid';
    DELETE FROM public.leads WHERE email IN ('phase3b-lead@example.invalid','phase3b-control@example.invalid') OR source IN ('phase3b_test','phase3b_control');
    COMMIT;`, false);
  expect(result.status).toBe(200);
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

async function browserLogin(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(credential.a.email);
  await page.getByLabel('Password').fill(credential.a.password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 60_000 });
}

test.describe.serial('Phase 3B trusted writes', () => {
  test.beforeAll(async () => {
    for (const value of [subdomain, region, adminSecret, credential.a.email, credential.a.password, credential.b.email, credential.b.password]) expect(value).not.toBe('');
    sessionA = await login(credential.a.email, credential.a.password);
    sessionB = await login(credential.b.email, credential.b.password);
    expect(sessionA.user.id).not.toBe(sessionB.user.id);
    await cleanup();
    expect(await counts()).toEqual(['0', '0', '0', '0']);

    const exported = await adminMetadata({ type: 'export_metadata', args: {} });
    expect(exported.status).toBe(200);
    metadataHash = createHash('sha256').update(exported.text).digest('hex').toUpperCase();
    const identities = await sql("SELECT id::text, public_slug FROM public.agencies WHERE public_slug IN ('phase2b-a','phase2b-b') ORDER BY public_slug;");
    expect(identities.status).toBe(200);
    const agencyRows = identities.body.result.slice(1);
    agencyA = agencyRows[0][0];
    agencyB = agencyRows[1][0];
    const control = await sql(`INSERT INTO public.leads(id,agency_id,first_name,last_name,email,source,notes) VALUES ('${leadB}','${agencyB}','Phase3B','Control','phase3b-control@example.invalid','phase3b_control','B authorized');`, false);
    expect(control.status).toBe(200);
    expect(await counts()).toEqual(['1', '0', '0', '0']);
  });

  test.afterAll(async () => {
    await cleanup();
    expect(await counts()).toEqual(['0', '0', '0', '0']);
    const consistency = await adminMetadata({ type: 'get_inconsistent_metadata', args: {} });
    expect(consistency.status).toBe(200);
    expect(consistency.body.is_consistent).toBe(true);
    expect(consistency.body.inconsistent_objects ?? []).toHaveLength(0);
    const exported = await adminMetadata({ type: 'export_metadata', args: {} });
    const finalHash = createHash('sha256').update(exported.text).digest('hex').toUpperCase();
    expect(finalHash).toBe(metadataHash);
    console.log(`PHASE3B_METADATA_HASH_BEFORE=${metadataHash}`);
    console.log(`PHASE3B_METADATA_HASH_AFTER=${finalHash}`);
    console.log('PHASE3B_FINAL_COUNTS=0,0,0,0');
    console.log('PHASE3B_REMOTE_TEST_FIXTURES=CLEANED');
  });

  test('public boundary rejects malformed, oversized, forged, unknown-tenant, and cross-tenant requests', async ({ request }) => {
    let response = await request.fetch('/api/public/leads', { method: 'POST', headers: { 'content-type': 'application/json' }, data: '{' });
    expect(response.status()).toBe(400);

    response = await request.post('/api/public/candidates', { data: { ...candidatePayload, why_interested: 'x'.repeat(33_000) } });
    expect(response.status()).toBe(413);

    response = await request.post('/api/public/leads', { data: { ...leadPayload, agency_id: agencyB, score: 100 } });
    expect(response.status()).toBe(400);

    response = await request.post('/api/public/leads', { data: { ...leadPayload, agency_slug: 'unknown-phase3b-agency' } });
    expect(response.status()).toBe(404);

    response = await request.post('/api/public/appointments', { data: {
      agency_slug: 'phase2b-a', idempotency_key: randomUUID(), lead_id: leadB, date: '2099-02-01', time: '10:00', meeting_type: 'Educational Consultation',
    } });
    expect(response.status()).toBe(404);

    const insert = 'mutation($agency:uuid!){insert_leads_one(object:{agency_id:$agency,first_name:"Forged",last_name:"Insert",email:"forged@example.invalid"}){id}}';
    const anonymousInsert = await graphql(insert, { agency: agencyA });
    expect(anonymousInsert.body?.data?.insert_leads_one).toBeFalsy();
    const userInsert = await graphql(insert, { agency: agencyA }, sessionA.accessToken);
    expect(userInsert.body?.data?.insert_leads_one).toBeFalsy();
  });

  test('trusted public routes create server-owned tenant, score, consent, candidate, and appointment rows', async ({ request }) => {
    const concurrentLeadResponses = await Promise.all(Array.from({ length: 6 }, () => request.post('/api/public/leads', { data: leadPayload })));
    expect(concurrentLeadResponses.map((response) => response.status())).toEqual([201, 201, 201, 201, 201, 201]);
    const concurrentLeads = await Promise.all(concurrentLeadResponses.map((response) => response.json()));
    expect(new Set(concurrentLeads.map((lead) => lead.id)).size).toBe(1);
    const lead = concurrentLeads[0];
    publicLeadId = lead.id;
    expect(lead.agency_id).toBe(agencyA);
    expect(lead.status).toBe('new');
    expect(lead.score).toBe(97);
    expect(lead.score_tier).toBe('priority');
    expect(lead.consent).toBe(true);
    expect(lead.consent_method).toBe('checkup_form');
    expect(lead.ai_summary).toContain('Score: 97/100');

    let response = await request.post('/api/public/leads', { data: { ...leadPayload, first_name: 'Different' } });
    expect(response.status()).toBe(409);

    const consent = await sql(`SELECT agency_id::text, consent_type, consent_text, (created_at IS NOT NULL)::text FROM public.consents WHERE lead_id='${publicLeadId}';`);
    expect(consent.body.result[1][0]).toBe(agencyA);
    expect(consent.body.result[1][1]).toBe('contact');
    expect(consent.body.result[1][2]).toBe('I consent to be contacted about my financial checkup results.');
    expect(consent.body.result[1][3]).toBe('true');

    response = await request.post('/api/public/candidates', { data: candidatePayload });
    expect(response.status()).toBe(201);
    const candidate = await response.json();
    publicCandidateId = candidate.id;
    expect(candidate.agency_id).toBe(agencyA);
    expect(candidate.status).toBe('new');
    expect(candidate.score).toBe(69);
    response = await request.post('/api/public/candidates', { data: candidatePayload });
    expect(response.status()).toBe(201);
    expect((await response.json()).id).toBe(publicCandidateId);
    response = await request.post('/api/public/candidates', { data: { ...candidatePayload, state: 'TX' } });
    expect(response.status()).toBe(409);

    const appointmentIdempotencyKey = randomUUID();
    response = await request.post('/api/public/appointments', { data: {
      agency_slug: 'phase2b-a', idempotency_key: appointmentIdempotencyKey, lead_id: publicLeadId, date: '2099-02-02', time: '11:00', meeting_type: 'Educational Consultation', notes: 'Phase 3B trusted appointment.',
    } });
    expect(response.status()).toBe(201);
    const appointment = await response.json();
    publicAppointmentId = appointment.id;
    expect(appointment.agency_id).toBe(agencyA);
    expect(appointment.lead_id).toBe(publicLeadId);
    expect(appointment.status).toBe('requested');
    response = await request.post('/api/public/appointments', { data: {
      agency_slug: 'phase2b-a', idempotency_key: appointmentIdempotencyKey, lead_id: publicLeadId, date: '2099-02-02', time: '11:00', meeting_type: 'Educational Consultation', notes: 'Phase 3B trusted appointment.',
    } });
    expect(response.status()).toBe(201);
    expect((await response.json()).id).toBe(publicAppointmentId);
    response = await request.post('/api/public/appointments', { data: {
      agency_slug: 'phase2b-a', idempotency_key: appointmentIdempotencyKey, lead_id: publicLeadId, date: '2099-02-03', time: '11:00', meeting_type: 'Educational Consultation', notes: 'Phase 3B trusted appointment.',
    } });
    expect(response.status()).toBe(409);

    expect(await counts()).toEqual(['2', '1', '1', '1']);
    const own = await graphql('query($lead:uuid!,$candidate:uuid!,$appointment:uuid!){leads_by_pk(id:$lead){id} candidates_by_pk(id:$candidate){id} appointments_by_pk(id:$appointment){id}}', { lead: publicLeadId, candidate: publicCandidateId, appointment: publicAppointmentId }, sessionA.accessToken);
    expect(own.body.data.leads_by_pk.id).toBe(publicLeadId);
    expect(own.body.data.candidates_by_pk.id).toBe(publicCandidateId);
    expect(own.body.data.appointments_by_pk.id).toBe(publicAppointmentId);
    const foreign = await graphql('query($lead:uuid!,$candidate:uuid!,$appointment:uuid!){leads_by_pk(id:$lead){id} candidates_by_pk(id:$candidate){id} appointments_by_pk(id:$appointment){id}}', { lead: publicLeadId, candidate: publicCandidateId, appointment: publicAppointmentId }, sessionB.accessToken);
    expect(foreign.body.data).toEqual({ leads_by_pk: null, candidates_by_pk: null, appointments_by_pk: null });
  });

  test('real User A application session performs only allowed updates and persists them', async ({ page }) => {
    await browserLogin(page);
    await page.goto(`/dashboard/leads/${publicLeadId}`);
    await expect(page.getByRole('heading', { name: 'Phase3B Lead' })).toBeVisible();
    await expect(page.getByLabel('Assigned agent')).toBeDisabled();
    await page.getByLabel('Lead status').click();
    await page.getByRole('option', { name: 'Qualified', exact: true }).click();
    await expect(page.getByText('Status updated')).toBeVisible();
    await page.getByLabel('Add a note').fill('Phase 3B authenticated note.');
    await page.getByRole('button', { name: 'Add Note', exact: true }).click();
    await expect(page.getByText('Phase 3B authenticated note.')).toBeVisible();

    await page.goto('/dashboard/appointments');
    const appointmentStatus = page.getByLabel('Appointment status for Phase3B Lead');
    await appointmentStatus.click();
    await page.getByRole('option', { name: 'Confirmed', exact: true }).click();
    await expect(page.getByText('Appointment status updated')).toBeVisible();

    await page.goto('/dashboard/recruiting');
    const candidateStatus = page.getByLabel('Candidate status for Phase3B Candidate');
    await candidateStatus.click();
    await page.getByRole('option', { name: 'Contacted', exact: true }).click();
    await page.reload();
    await expect(page.getByLabel('Candidate status for Phase3B Candidate')).toContainText('Contacted');

    const persisted = await graphql('query($lead:uuid!,$candidate:uuid!,$appointment:uuid!){leads_by_pk(id:$lead){status notes agency_id} candidates_by_pk(id:$candidate){status agency_id} appointments_by_pk(id:$appointment){status agency_id}}', { lead: publicLeadId, candidate: publicCandidateId, appointment: publicAppointmentId }, sessionA.accessToken);
    expect(persisted.body.data.leads_by_pk).toMatchObject({ status: 'qualified', agency_id: agencyA });
    expect(persisted.body.data.leads_by_pk.notes).toContain('Phase 3B authenticated note.');
    expect(persisted.body.data.candidates_by_pk).toEqual({ status: 'contacted', agency_id: agencyA });
    expect(persisted.body.data.appointments_by_pk).toEqual({ status: 'confirmed', agency_id: agencyA });
  });

  test('cross-tenant writes, row transfer, role spoofing, and audit forgery remain blocked', async ({ page }) => {
    const update = 'mutation($id:uuid!){update_leads(where:{id:{_eq:$id}},_set:{notes:"cross-tenant"}){affected_rows}}';
    const cross = await graphql(update, { id: publicLeadId }, sessionB.accessToken);
    expect(cross.body.data.update_leads.affected_rows).toBe(0);

    const sessionless = await graphql(update, { id: publicLeadId });
    expect(sessionless.body?.data?.update_leads).toBeFalsy();

    const ownB = await graphql('mutation($id:uuid!,$notes:String!){update_leads(where:{id:{_eq:$id}},_set:{notes:$notes}){affected_rows}}', { id: leadB, notes: 'Phase 3B User B authorized' }, sessionB.accessToken);
    expect(ownB.body.data.update_leads.affected_rows).toBe(1);
    const restoreB = await graphql('mutation($id:uuid!){update_leads(where:{id:{_eq:$id}},_set:{notes:"B authorized"}){affected_rows}}', { id: leadB }, sessionB.accessToken);
    expect(restoreB.body.data.update_leads.affected_rows).toBe(1);

    const transfer = await graphql('mutation($id:uuid!,$agency:uuid!){update_leads(where:{id:{_eq:$id}},_set:{agency_id:$agency}){affected_rows}}', { id: publicLeadId, agency: agencyB }, sessionA.accessToken);
    expect(transfer.body?.data?.update_leads).toBeFalsy();

    const forgedAudit = await graphql('mutation($agency:uuid!){insert_audit_logs_one(object:{agency_id:$agency,action:"forged"}){id}}', { agency: agencyA }, sessionA.accessToken);
    expect(forgedAudit.body?.data?.insert_audit_logs_one).toBeFalsy();

    const roleSpoof = await graphql('query{agencies{id}}', {}, sessionA.accessToken, { 'x-hasura-role': 'admin' });
    expect(roleSpoof.body?.data?.agencies).toBeFalsy();
    const identitySpoof = await graphql('query($id:uuid!){agencies_by_pk(id:$id){id}}', { id: agencyB }, sessionA.accessToken, { 'x-hasura-user-id': sessionB.user.id });
    expect(identitySpoof.body?.data?.agencies_by_pk).toBeFalsy();

    await page.goto('/login');
    await page.getByLabel('Email').fill(credential.b.email);
    await page.getByLabel('Password').fill(credential.b.password);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 60_000 });
    await page.goto(`/dashboard/leads/${publicLeadId}`);
    await expect(page.getByRole('heading', { name: 'Lead Not Found' })).toBeVisible();
  });
});
