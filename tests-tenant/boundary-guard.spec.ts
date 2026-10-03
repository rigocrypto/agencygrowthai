import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

/*
Guards the architectural principle, not a behaviour.

The proposed way to prove RLS is the real boundary is: delete the repository's
`.eq('agency_id', …)` filter, re-run the isolation suite, and confirm it still passes.
There is nothing to delete — lib/repo/supabase.ts was written without a tenant filter on
purpose, and tests-tenant/*.spec.ts never call the repository at all, so the isolation
proof is already independent of it.

What is worth guarding is the future. Adding `.eq('agency_id', …)` to a read would look
like a harmless optimisation while quietly making the application the thing that keeps
tenants apart — and every isolation test would keep passing, because none of them route
through this file. This test fails the moment that happens.

Filtering by a row's own id (a primary-key lookup) is not a tenant filter and stays legal.
*/

const REPO_SOURCE = 'lib/repo/supabase.ts';

test('the Supabase repository does not filter reads by agency_id', () => {
  const source = readFileSync(REPO_SOURCE, 'utf8');

  // Strip comments: the file discusses agency_id at length in prose.
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  const offenders = [
    /\.eq\(\s*['"`]agency_id['"`]/,
    /\.filter\(\s*['"`]agency_id['"`]/,
    /\.match\(\s*\{[^}]*agency_id/,
    /agency_id=eq\./,
  ].filter((pattern) => pattern.test(code));

  expect(
    offenders.map(String),
    `${REPO_SOURCE} filters by agency_id. That makes the application a tenant boundary, ` +
      `which the isolation suite cannot detect because it never calls the repository. ` +
      `Tenant scoping belongs to RLS via user_agency_id().`
  ).toEqual([]);
});

/*
A write-authorization probe must never send `Prefer: return=representation`.

With that header PostgREST inserts and then SELECTs the row back. When the caller has no
SELECT policy — the normal case for an anonymous funnel — the read-back fails and the
response reads "new row violates row-level security policy for table X". That is the
error you would expect from a refused INSERT, so the probe goes green while the INSERT is
in fact permitted and the row is committed.

That exact confusion hid a live cross-tenant write on candidates, appointments and
consents (closed in migration 20260816130000). The rule is enforced here rather than
written down, because a documented convention does not turn red.

Reads may use the header freely; this only constrains POST probes.
*/
test('no INSERT authorization probe asks PostgREST to read the row back', () => {
  const dir = 'tests-tenant';
  const specs = readdirSync(dir).filter((f) => f.endsWith('.spec.ts'));

  const offenders: string[] = [];
  for (const file of specs) {
    const source = readFileSync(join(dir, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    // Look at each .post( … ) call and flag the ones carrying the header.
    const calls = source.match(/\.post\([\s\S]*?\n\s{4}\}\);/g) ?? [];
    for (const call of calls) {
      if (/return=representation/.test(call)) {
        const line = source.slice(0, source.indexOf(call)).split('\n').length;
        offenders.push(`${file}:${line}`);
      }
    }
  }

  expect(
    offenders,
    `these POST probes send Prefer: return=representation, which turns a denied read-back ` +
      `into what looks like a denied INSERT:\n${offenders.join('\n')}`
  ).toEqual([]);
});

test('the repository never accepts an agency id from its callers', () => {
  const source = readFileSync(REPO_SOURCE, 'utf8');
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  // No method signature may take an agency identifier as a parameter.
  expect(
    /\(\s*[^)]*agency(_?)[Ii]d\s*[:,)]/.test(code),
    `${REPO_SOURCE} takes an agency id as a parameter. The tenant must come from the ` +
      `authenticated session via auth.uid() -> agents.user_id -> agents.agency_id.`
  ).toBeFalsy();
});
