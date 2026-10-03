import { expect, test, type APIRequestContext } from '@playwright/test';
import { AGENCY_A, AGENCY_B, TENANT_TABLES, env } from './fixtures';

/*
Tenant isolation across every tenant-owned table.

The eight-test suite in tenant-isolation.spec.ts proves the boundary in depth, but only
for `leads`. Thirteen other tables carry the same agency_id column and their own policies,
and policies are written per table — one missing WITH CHECK is all it takes. This file
sweeps all of them with the same three questions, so a new table cannot quietly ship
without isolation.

Everything goes straight to PostgREST with a user's own token. The repository is not
involved anywhere in this file.
*/

async function signIn(request: APIRequestContext, email: string, password: string): Promise<string> {
  const res = await request.post(`${env.url}/auth/v1/token?grant_type=password`, {
    headers: { apikey: env.anonKey, 'Content-Type': 'application/json' },
    data: { email, password },
  });
  expect(res.ok(), `sign-in failed for ${email}: ${res.status()}`).toBeTruthy();
  return (await res.json()).access_token as string;
}

const authHeaders = (token: string) => ({
  apikey: env.anonKey,
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
});

const anonHeaders = () => ({
  apikey: env.anonKey,
  Authorization: `Bearer ${env.anonKey}`,
  'Content-Type': 'application/json',
});

let tokenA = '';
let tokenB = '';

test.beforeAll(async ({ playwright }) => {
  const request = await playwright.request.newContext();
  tokenA = await signIn(request, env.userA.email, env.userA.password);
  tokenB = await signIn(request, env.userB.email, env.userB.password);
  await request.dispose();
});

for (const spec of TENANT_TABLES) {
  const { table } = spec;

  test(`${table} — anonymous callers get nothing, and the table exists`, async ({ request }) => {
    const res = await request.get(`${env.url}/rest/v1/${table}?select=*&limit=5`, {
      headers: anonHeaders(),
    });
    // 404 would mean the table is missing, which would make an empty result meaningless.
    expect(res.status(), `${table} must exist and be exposed`).toBe(200);
    expect(await res.json(), `${table} must not leak rows to anonymous callers`).toEqual([]);
  });

  test(`${table} — each tenant sees only its own rows`, async ({ request }) => {
    for (const [label, token, own, foreign] of [
      ['A', tokenA, AGENCY_A.id, AGENCY_B.id],
      ['B', tokenB, AGENCY_B.id, AGENCY_A.id],
    ] as const) {
      const res = await request.get(`${env.url}/rest/v1/${table}?select=agency_id`, {
        headers: authHeaders(token),
      });
      expect(res.status()).toBe(200);
      const rows = (await res.json()) as { agency_id: string }[];

      expect(rows.length, `${table}: agency ${label} should see its seeded row`).toBeGreaterThan(0);
      expect(
        rows.every((r) => r.agency_id === own),
        `${table}: agency ${label} saw rows from another tenant`
      ).toBeTruthy();
      expect(
        rows.some((r) => r.agency_id === foreign),
        `${table}: agency ${label} leaked rows owned by ${foreign}`
      ).toBeFalsy();
    }
  });

  test(`${table} — a tenant cannot write into another tenant`, async ({ request }) => {
    // Agency A inserting a row owned by Agency B. AGENCY_B genuinely exists, so a
    // foreign-key error here would mean the fixtures are wrong, not that policy held.
    const probeId = `cccccccc-0000-4000-8000-${String(Date.now()).slice(-12)}`;
    // No read-back header: the inserted row would belong to B, which A cannot SELECT, so
    // a representation request fails on the read and hides whether the INSERT was allowed.
    const res = await request.post(`${env.url}/rest/v1/${table}`, {
      headers: authHeaders(tokenA),
      data: spec.insert(AGENCY_B.id, probeId),
    });
    const body = await res.text();

    expect(body, `${table}: rejected by a foreign key, not by policy — fixture problem`).not.toContain('23503');
    expect(body, `${table}: rejected by a column constraint, not by policy — fixture problem`).not.toContain(
      '23514'
    );
    expect(
      res.status(),
      `${table}: cross-tenant INSERT by agency A was accepted (${res.status()}) ${body.slice(0, 120)}`
    ).toBeGreaterThanOrEqual(400);

    // Status alone is not proof of absence. Ask the owning tenant whether it landed.
    const landed = await request.get(`${env.url}/rest/v1/${table}?select=id&id=eq.${probeId}`, {
      headers: authHeaders(tokenB),
    });
    expect(await landed.json(), `${table}: agency A planted a row inside agency B`).toEqual([]);
  });

  if (spec.rowA) {
    test(`${table} — a tenant cannot hand its own row to another tenant`, async ({ request }) => {
      /*
       * The subtler direction. The test above attacks rows belonging to B, which the
       * USING clause stops. This one touches only A's own row and rewrites its agency_id
       * — stopped by WITH CHECK, a separate clause that is easy to omit. It was found by
       * hand on `leads`; every other table needs it asserted, not assumed.
       */
      const res = await request.patch(`${env.url}/rest/v1/${table}?id=eq.${spec.rowA}`, {
        headers: { ...authHeaders(tokenA), Prefer: 'return=representation' },
        data: { agency_id: AGENCY_B.id },
      });
      const body = await res.text();
      expect(
        body === '[]' || body.includes('42501'),
        `${table}: agency A moved its own row into agency B — got ${res.status()} ${body.slice(0, 120)}`
      ).toBeTruthy();

      // And the row is still A's.
      const after = await request.get(`${env.url}/rest/v1/${table}?select=agency_id&id=eq.${spec.rowA}`, {
        headers: authHeaders(tokenA),
      });
      const rows = (await after.json()) as { agency_id: string }[];
      expect(rows[0]?.agency_id, `${table}: row ${spec.rowA} no longer belongs to agency A`).toBe(AGENCY_A.id);
    });
  }

  if (spec.rowB) {
    test(`${table} — a tenant cannot read or modify a known foreign row`, async ({ request }) => {
      const read = await request.get(`${env.url}/rest/v1/${table}?select=*&id=eq.${spec.rowB}`, {
        headers: authHeaders(tokenA),
      });
      expect(await read.json(), `${table}: agency A read agency B's row ${spec.rowB}`).toEqual([]);

      const update = await request.patch(`${env.url}/rest/v1/${table}?id=eq.${spec.rowB}`, {
        headers: { ...authHeaders(tokenA), Prefer: 'return=representation' },
        data: { agency_id: AGENCY_A.id },
      });
      const updated = await update.text();
      expect(
        updated === '[]' || updated.includes('42501'),
        `${table}: agency A altered agency B's row — got ${update.status()} ${updated}`
      ).toBeTruthy();
    });
  }
}

test('tables with a public_insert policy do not let anonymous callers choose the tenant', async ({
  request,
}) => {
  const publicTables = TENANT_TABLES.filter((t) => t.publicInsert);
  expect(publicTables.length, 'expected some tables to carry public_insert policies').toBeGreaterThan(0);

  const failures: string[] = [];
  for (const spec of publicTables) {
    const probeId = `dddddddd-0000-4000-8000-${String(Date.now()).slice(-12)}`;

    /*
     * Deliberately NO `Prefer: return=representation`.
     *
     * With it, PostgREST inserts and then SELECTs the row back. Anonymous callers have no
     * SELECT policy on these tables, so the read-back fails with 42501 and the whole
     * request reports "new row violates row-level security policy" — which reads exactly
     * like the INSERT was refused. It was not. Drop the header and the same request
     * returns 201 with the row committed.
     *
     * This masked a real hole on candidates/appointments/consents. The probe now asserts
     * on the status code, and then goes and checks whether the row actually landed.
     */
    const res = await request.post(`${env.url}/rest/v1/${spec.table}`, {
      headers: anonHeaders(),
      data: spec.insert(AGENCY_B.id, probeId),
    });
    const body = await res.text();

    // AGENCY_B genuinely exists, so a constraint error would mean a broken probe.
    if (body.includes('23503') || body.includes('23514')) {
      failures.push(`${spec.table}: rejected by a constraint, not by policy (${body.slice(0, 90)})`);
      continue;
    }

    if (res.status() < 400) {
      failures.push(
        `${spec.table}: anonymous INSERT into another tenant SUCCEEDED (${res.status()}) — the caller chose agency_id`
      );
    }
  }

  expect(failures, `anonymous tenant selection is possible:\n${failures.join('\n')}`).toEqual([]);
});
