import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

function readEnv(path) {
  const values = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    let value = match[2];
    if (value.length > 1 && ((value[0] === '"' && value.at(-1) === '"') || (value[0] === "'" && value.at(-1) === "'"))) value = value.slice(1, -1);
    values[match[1]] = value;
  }
  return values;
}

const publicEnv = readEnv('.env.local');
const serverEnv = readEnv('.env');
const subdomain = publicEnv.NEXT_PUBLIC_NHOST_SUBDOMAIN;
const region = publicEnv.NEXT_PUBLIC_NHOST_REGION;
const secret = serverEnv.HASURA_ADMIN_SECRET ?? serverEnv.HASURA_GRAPHQL_ADMIN_SECRET ?? serverEnv.NHOST_ADMIN_SECRET;
assert.ok(subdomain && region && secret, 'local Nhost configuration is incomplete');
const hasura = `https://${subdomain}.hasura.${region}.nhost.run`;
const headers = { 'content-type': 'application/json', 'x-hasura-admin-secret': secret };

async function request(path, body) {
  const response = await fetch(`${hasura}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  const text = await response.text();
  let json;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }
  if (!response.ok) throw new Error(`Nhost request failed (${response.status})`);
  return { json, text };
}

async function sql(statement, readOnly = true) {
  const result = await request('/v2/query', { type: 'run_sql', args: { source: 'default', sql: statement, read_only: readOnly, cascade: false } });
  if (result.json?.error) throw new Error('Nhost SQL request failed');
  return result.json.result;
}

const snapshotSql = `SELECT
  (SELECT count(*) FROM auth.users)::text AS auth_users,
  (SELECT count(*) FROM public.agencies)::text AS agencies,
  (SELECT count(*) FROM public.agents)::text AS agents,
  (SELECT count(*) FROM public.leads)::text AS leads,
  (SELECT count(*) FROM public.candidates)::text AS candidates,
  (SELECT count(*) FROM public.appointments)::text AS appointments;`;
const catalogSql = `SELECT
  (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('leads','candidates','appointments') AND column_name IN ('idempotency_key','idempotency_fingerprint'))::text,
  (SELECT count(*) FROM pg_constraint WHERE connamespace='public'::regnamespace AND conname IN ('leads_agency_id_idempotency_key_key','candidates_agency_id_idempotency_key_key','appointments_agency_id_idempotency_key_key') AND contype='u')::text,
  (SELECT count(*) FROM pg_constraint WHERE connamespace='public'::regnamespace AND conname IN ('leads_idempotency_fingerprint_format','candidates_idempotency_fingerprint_format','appointments_idempotency_fingerprint_format') AND contype='c')::text;`;

const beforeMetadata = await request('/v1/metadata', { type: 'export_metadata', args: {} });
const beforeHash = createHash('sha256').update(beforeMetadata.text).digest('hex').toUpperCase();
const beforeCounts = (await sql(snapshotSql))[1];
const beforeCatalog = (await sql(catalogSql))[1];
assert.ok(beforeCatalog.join(',') === '0,0,0' || beforeCatalog.join(',') === '6,3,3', 'partial idempotency schema detected');

if (beforeCatalog.join(',') === '0,0,0') {
  const migration = readFileSync('nhost/migrations/default/20260906120000_phase3c_public_intake_guards/up.sql', 'utf8');
  await sql(migration, false);
  console.log('IDEMPOTENCY_MIGRATION=APPLIED');
} else {
  console.log('IDEMPOTENCY_MIGRATION=ALREADY_APPLIED');
}

await request('/v1/metadata', { type: 'reload_metadata', args: { reload_sources: true } });
const afterCatalog = (await sql(catalogSql))[1];
assert.deepEqual(afterCatalog, ['6', '3', '3']);
const afterCounts = (await sql(snapshotSql))[1];
assert.deepEqual(afterCounts, beforeCounts, 'migration changed row counts');
const consistency = await request('/v1/metadata', { type: 'get_inconsistent_metadata', args: {} });
assert.equal(consistency.json.is_consistent, true);
assert.deepEqual(consistency.json.inconsistent_objects ?? [], []);
const afterMetadata = await request('/v1/metadata', { type: 'export_metadata', args: {} });
const afterHash = createHash('sha256').update(afterMetadata.text).digest('hex').toUpperCase();
assert.equal(afterHash, beforeHash, 'Hasura metadata changed');

console.log('IDEMPOTENCY_COLUMNS=6/6');
console.log('TENANT_UNIQUE_CONSTRAINTS=3/3');
console.log('FINGERPRINT_CHECKS=3/3');
console.log(`ROW_COUNTS_BEFORE=${beforeCounts.join(',')}`);
console.log(`ROW_COUNTS_AFTER=${afterCounts.join(',')}`);
console.log(`METADATA_HASH_BEFORE=${beforeHash}`);
console.log(`METADATA_HASH_AFTER=${afterHash}`);
console.log('METADATA_CONSISTENCY=VERIFIED');
console.log('PHASE3C_IDEMPOTENCY_SCHEMA=VERIFIED');
