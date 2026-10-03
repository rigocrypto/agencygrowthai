import { expect, test, type APIRequestContext } from '@playwright/test';
import {
  AGENCY_A,
  AGENCY_B,
  EXPECTED_SCORE_FOR_ANSWERS,
  LEADS_A,
  LEADS_B,
  SCORING_ANSWERS,
  env,
} from './fixtures';

/*
Tenant isolation, tested at the HTTP boundary.

Every request here goes straight to PostgREST with a user's own access token. The
repository is not involved, on purpose: if these pass only because lib/repo/supabase.ts
adds a WHERE clause, the product is not isolated — anyone can skip that file. What is
under test is PostgreSQL's answer, which is the boundary that actually holds.
*/

async function signIn(request: APIRequestContext, email: string, password: string): Promise<string> {
  const res = await request.post(`${env.url}/auth/v1/token?grant_type=password`, {
    headers: { apikey: env.anonKey, 'Content-Type': 'application/json' },
    data: { email, password },
  });
  expect(res.ok(), `sign-in failed for ${email}: ${res.status()} ${await res.text()}`).toBeTruthy();
  const body = await res.json();
  expect(body.access_token, `no access token for ${email}`).toBeTruthy();
  return body.access_token as string;
}

function authHeaders(token: string) {
  return { apikey: env.anonKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

function anonHeaders() {
  return { apikey: env.anonKey, Authorization: `Bearer ${env.anonKey}`, 'Content-Type': 'application/json' };
}

test.describe('tenant isolation', () => {
  test('TEST 1 — Agency A sees only Agency A leads', async ({ request }) => {
    const token = await signIn(request, env.userA.email, env.userA.password);
    const res = await request.get(`${env.url}/rest/v1/leads?select=id,agency_id`, {
      headers: authHeaders(token),
    });
    expect(res.status()).toBe(200);
    const rows = (await res.json()) as { id: string; agency_id: string }[];

    expect(rows.length).toBeGreaterThan(0);
    // Every visible row belongs to A, and A's seeded leads are among them. Not an exact
    // set match: the funnel tests legitimately add leads to A, and asserting equality
    // would make this pass or fail on test order rather than on isolation.
    expect(new Set(rows.map((r) => r.agency_id))).toEqual(new Set([AGENCY_A.id]));
    const visible = new Set(rows.map((r) => r.id));
    for (const lead of LEADS_A) expect(visible.has(lead.id), `A must see its own lead ${lead.id}`).toBe(true);
    for (const lead of LEADS_B) expect(visible.has(lead.id), `A must not see B's lead ${lead.id}`).toBe(false);
  });

  test('TEST 2 — Agency B sees only Agency B leads', async ({ request }) => {
    const token = await signIn(request, env.userB.email, env.userB.password);
    const res = await request.get(`${env.url}/rest/v1/leads?select=id,agency_id`, {
      headers: authHeaders(token),
    });
    expect(res.status()).toBe(200);
    const rows = (await res.json()) as { id: string; agency_id: string }[];

    expect(rows.length).toBeGreaterThan(0);
    expect(new Set(rows.map((r) => r.agency_id))).toEqual(new Set([AGENCY_B.id]));
    const visible = new Set(rows.map((r) => r.id));
    for (const lead of LEADS_B) expect(visible.has(lead.id), `B must see its own lead ${lead.id}`).toBe(true);
    for (const lead of LEADS_A) expect(visible.has(lead.id), `B must not see A's lead ${lead.id}`).toBe(false);
  });

  test("TEST 3 — Agency A cannot read an Agency B lead by id", async ({ request }) => {
    const token = await signIn(request, env.userA.email, env.userA.password);
    const res = await request.get(`${env.url}/rest/v1/leads?select=*&id=eq.${LEADS_B[0].id}`, {
      headers: authHeaders(token),
    });
    expect(res.status()).toBe(200);
    expect(await res.json(), 'Agency B lead must be invisible to Agency A').toEqual([]);
  });

  test("TEST 4 — Agency B cannot read an Agency A lead by id", async ({ request }) => {
    const token = await signIn(request, env.userB.email, env.userB.password);
    const res = await request.get(`${env.url}/rest/v1/leads?select=*&id=eq.${LEADS_A[0].id}`, {
      headers: authHeaders(token),
    });
    expect(res.status()).toBe(200);
    expect(await res.json(), 'Agency A lead must be invisible to Agency B').toEqual([]);
  });

  test('TEST 5 — Agency A cannot create a lead owned by Agency B', async ({ request }) => {
    const token = await signIn(request, env.userA.email, env.userA.password);
    // No read-back header — it would fail on the SELECT and mask a permitted INSERT.
    const res = await request.post(`${env.url}/rest/v1/leads`, {
      headers: authHeaders(token),
      data: {
        agency_id: AGENCY_B.id,
        first_name: 'TEST',
        last_name: 'CrossTenant',
        email: 'test.cross@isolation.invalid',
        phone: '(555) 000-0000',
        consent: true,
      },
    });

    // The WITH CHECK on insert_own_leads must reject this outright.
    expect(res.status(), `expected rejection, got ${res.status()} ${await res.text()}`).toBeGreaterThanOrEqual(400);

    // And nothing may have landed in Agency B.
    const tokenB = await signIn(request, env.userB.email, env.userB.password);
    const check = await request.get(
      `${env.url}/rest/v1/leads?select=id&email=eq.test.cross@isolation.invalid`,
      { headers: authHeaders(tokenB) }
    );
    expect(await check.json(), 'no cross-tenant lead may exist in Agency B').toEqual([]);
  });

  test('TEST 6 — anonymous funnel creates a lead for the validated agency only', async ({ request }) => {
    const email = `test.anon.${Date.now()}@isolation.invalid`;
    // Through the real public entry point: the app's server route, not PostgREST.
    const res = await request.post(`${env.appUrl}/api/public/leads`, {
      data: {
        agency_slug: AGENCY_A.slug,
        first_name: 'TEST',
        last_name: 'AnonFunnel',
        email,
        phone: '(555) 000-0001',
        consent: true,
        checkup_responses: SCORING_ANSWERS,
      },
    });

    expect(res.status(), `public lead intake failed: ${await res.text()}`).toBe(201);
    const created = await res.json();
    expect(created.agency_id, 'the lead must belong to the agency owning the slug').toBe(AGENCY_A.id);

    // The score was computed server-side from the answers, never sent by the caller.
    expect(created.score, 'the server must score the lead from its answers').toBeGreaterThan(0);

    // Agency B must not be able to see it.
    const tokenB = await signIn(request, env.userB.email, env.userB.password);
    const leaked = await request.get(`${env.url}/rest/v1/leads?select=id&email=eq.${email}`, {
      headers: authHeaders(tokenB),
    });
    expect(await leaked.json(), 'Agency B must not see a lead created for Agency A').toEqual([]);
  });

  test('TEST 7 — anonymous callers cannot forge tenant ownership or score', async ({ request }) => {
    // 7a — an unknown slug is refused rather than defaulting to some agency.
    const forged = await request.post(`${env.appUrl}/api/public/leads`, {
      data: {
        agency_slug: 'no-such-agency-slug',
        first_name: 'TEST',
        last_name: 'ForgedSlug',
        email: 'test.forged@isolation.invalid',
        phone: '(555) 000-0002',
        consent: true,
      },
    });
    expect(forged.status(), `an unknown slug must be rejected: ${await forged.text()}`).toBe(404);

    // 7b — the browser cannot execute the intake function directly. If anon still holds
    // EXECUTE, it could pass its own score and choose its own priority.
    const rpc = await request.post(`${env.url}/rest/v1/rpc/public_create_lead`, {
      headers: anonHeaders(),
      data: {
        p_agency_slug: AGENCY_A.slug,
        p_first_name: 'TEST',
        p_last_name: 'AnonRpc',
        p_email: 'test.anonrpc@isolation.invalid',
        p_phone: '(555) 000-0004',
        p_consent: true,
        p_score: 100,
        p_score_tier: 'priority',
      },
    });
    const rpcBody = await rpc.text();
    expect(rpcBody, 'the function must exist — apply the tenant-resolution migration').not.toContain('PGRST202');
    expect(
      rpc.status(),
      `anon must not be able to execute public_create_lead, got ${rpc.status()} ${rpcBody}`
    ).toBeGreaterThanOrEqual(400);

    // 7c — a forged score submitted to the server route must be ignored, not stored.
    const forgedScore = await request.post(`${env.appUrl}/api/public/leads`, {
      data: {
        agency_slug: AGENCY_A.slug,
        first_name: 'TEST',
        last_name: 'ForgedScore',
        email: `test.forgedscore.${Date.now()}@isolation.invalid`,
        phone: '(555) 000-0005',
        consent: true,
        score: 100,
        score_tier: 'priority',
        checkup_responses: SCORING_ANSWERS,
      },
    });
    expect(forgedScore.status()).toBe(201);
    const scored = await forgedScore.json();
    expect(scored.score, 'a client-supplied score must not be persisted').not.toBe(100);
    expect(scored.score).toBe(EXPECTED_SCORE_FOR_ANSWERS);

    // 7b — the direct INSERT path must not exist for anonymous callers at all.
    // AGENCY_B genuinely exists once seeded, so a rejection here can only come from RLS.
    // No read-back header: anon has no SELECT policy, so it would fail on the read and
    // report an RLS error even where the INSERT itself was permitted.
    const direct = await request.post(`${env.url}/rest/v1/leads`, {
      headers: anonHeaders(),
      data: {
        agency_id: AGENCY_B.id,
        first_name: 'TEST',
        last_name: 'AnonDirect',
        email: 'test.anondirect@isolation.invalid',
        phone: '(555) 000-0003',
        consent: true,
      },
    });
    const directBody = await direct.text();

    // A foreign-key violation means the fixture agency is missing, not that RLS held.
    // Without this guard the test passes against an empty database and proves nothing.
    expect(
      directBody,
      'rejection came from a foreign-key violation, not from RLS — seed the fixtures first'
    ).not.toContain('23503');

    expect(
      direct.status(),
      `anonymous direct INSERT must be denied by RLS, got ${direct.status()} ${directBody}`
    ).toBeGreaterThanOrEqual(400);
  });

  test('TEST 8 — RLS blocks cross-tenant access without the repository', async ({ request }) => {
    const tokenA = await signIn(request, env.userA.email, env.userA.password);

    // Read every lead the database is willing to hand over, unfiltered.
    const all = await request.get(`${env.url}/rest/v1/leads?select=id,agency_id`, {
      headers: authHeaders(tokenA),
    });
    const rows = (await all.json()) as { agency_id: string }[];
    expect(
      rows.every((r) => r.agency_id === AGENCY_A.id),
      'an unfiltered query must still return only Agency A rows'
    ).toBeTruthy();

    // Ask for Agency B explicitly.
    const targeted = await request.get(
      `${env.url}/rest/v1/leads?select=id&agency_id=eq.${AGENCY_B.id}`,
      { headers: authHeaders(tokenA) }
    );
    expect(await targeted.json(), 'explicitly targeting Agency B must return nothing').toEqual([]);

    // Attempt a cross-tenant UPDATE.
    const update = await request.patch(
      `${env.url}/rest/v1/leads?id=eq.${LEADS_B[0].id}`,
      { headers: { ...authHeaders(tokenA), Prefer: 'return=representation' }, data: { status: 'lost' } }
    );
    expect(await update.json(), 'a cross-tenant UPDATE must affect no rows').toEqual([]);

    // Attempt a cross-tenant DELETE.
    const del = await request.delete(`${env.url}/rest/v1/leads?id=eq.${LEADS_B[0].id}`, {
      headers: { ...authHeaders(tokenA), Prefer: 'return=representation' },
    });
    expect(await del.json(), 'a cross-tenant DELETE must remove no rows').toEqual([]);

    // The subtler attack: A does not touch B's rows at all — it hands one of its OWN
    // rows over to B. A policy with USING but no WITH CHECK would allow exactly this.
    const donate = await request.patch(`${env.url}/rest/v1/leads?id=eq.${LEADS_A[0].id}`, {
      headers: { ...authHeaders(tokenA), Prefer: 'return=representation' },
      data: { agency_id: AGENCY_B.id },
    });
    const donateBody = await donate.text();
    expect(
      donateBody,
      `moving an own lead into another tenant must be refused by RLS, got ${donate.status()} ${donateBody}`
    ).toContain('42501');

    // And Agency B's rows are still intact.
    const tokenB = await signIn(request, env.userB.email, env.userB.password);
    const survivors = await request.get(`${env.url}/rest/v1/leads?select=id`, {
      headers: authHeaders(tokenB),
    });
    expect((await survivors.json()).length, "Agency B's leads must be untouched").toBe(LEADS_B.length);
  });
});
