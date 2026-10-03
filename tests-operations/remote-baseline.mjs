import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

function loadEnv(path) {
  if (!existsSync(path)) return {};
  return Object.fromEntries(readFileSync(path, 'utf8').split(/\r?\n/).flatMap((line) => {
    const value = line.trim();
    if (!value || value.startsWith('#') || !value.includes('=')) return [];
    const index = value.indexOf('=');
    const key = value.slice(0, index).trim();
    let item = value.slice(index + 1).trim();
    if ((item.startsWith('"') && item.endsWith('"')) || (item.startsWith("'") && item.endsWith("'"))) item = item.slice(1, -1);
    return [[key, item]];
  }));
}

const env = { ...loadEnv('.env'), ...loadEnv('.env.local'), ...loadEnv('.env.test.local'), ...process.env };
const subdomain = env.NEXT_PUBLIC_NHOST_SUBDOMAIN;
const region = env.NEXT_PUBLIC_NHOST_REGION;
const secret = env.HASURA_ADMIN_SECRET ?? env.HASURA_GRAPHQL_ADMIN_SECRET ?? env.NHOST_ADMIN_SECRET;
if (!subdomain || !region || !secret) throw new Error('NHOST_ADMIN_CONFIGURATION_NOT_PRESENT');
const base = `https://${subdomain}.hasura.${region}.nhost.run`;
const headers = { 'content-type': 'application/json', 'x-hasura-admin-secret': secret };

async function post(path, body) {
  const response = await fetch(`${base}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`REMOTE_REQUEST_FAILED_${response.status}`);
  return response.json();
}

async function sql(statement) {
  const body = await post('/v2/query', { type: 'run_sql', args: { source: 'default', sql: statement, read_only: true, cascade: false } });
  if (body.result_type !== 'TuplesOk' || !Array.isArray(body.result)) throw new Error('UNEXPECTED_SQL_RESPONSE');
  return body.result.slice(1);
}

const identity = await sql("SELECT current_database(), current_user, current_setting('server_version');");
const countRows = await sql(`
  SELECT table_name, row_count::text FROM (
    SELECT 'auth.users' table_name, count(*) row_count FROM auth.users
    UNION ALL SELECT 'public.agencies', count(*) FROM public.agencies
    UNION ALL SELECT 'public.agents', count(*) FROM public.agents
    UNION ALL SELECT 'public.leads', count(*) FROM public.leads
    UNION ALL SELECT 'public.candidates', count(*) FROM public.candidates
    UNION ALL SELECT 'public.appointments', count(*) FROM public.appointments
    UNION ALL SELECT 'public.campaigns', count(*) FROM public.campaigns
    UNION ALL SELECT 'public.consents', count(*) FROM public.consents
    UNION ALL SELECT 'public.settings', count(*) FROM public.settings
    UNION ALL SELECT 'public.campaign_events', count(*) FROM public.campaign_events
    UNION ALL SELECT 'public.lead_events', count(*) FROM public.lead_events
    UNION ALL SELECT 'public.candidate_events', count(*) FROM public.candidate_events
    UNION ALL SELECT 'public.content_assets', count(*) FROM public.content_assets
    UNION ALL SELECT 'public.content_reviews', count(*) FROM public.content_reviews
    UNION ALL SELECT 'public.ai_interactions', count(*) FROM public.ai_interactions
    UNION ALL SELECT 'public.audit_logs', count(*) FROM public.audit_logs
  ) counts ORDER BY table_name;
`);
const constraint = await sql(`
  SELECT count(*)::text
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public' AND t.relname = 'agents' AND c.contype = 'u'
    AND pg_get_constraintdef(c.oid) = 'UNIQUE (user_id)';
`);
const inconsistent = await post('/v1/metadata', { type: 'get_inconsistent_metadata', args: {} });
const metadata = await post('/v1/metadata', { type: 'export_metadata', args: {} });
const metadataHash = createHash('sha256').update(JSON.stringify(metadata)).digest('hex').toUpperCase();

const counts = Object.fromEntries(countRows);
const businessTables = Object.keys(counts).filter((name) => !['auth.users', 'public.agencies', 'public.agents'].includes(name));
const businessEmpty = businessTables.every((name) => counts[name] === '0');

console.log('REMOTE_BASELINE=VERIFIED');
console.log(`DATABASE_IDENTITY=${identity.length === 1 ? 'VERIFIED' : 'FAILED'}`);
console.log(`DATABASE_VERSION=${identity[0]?.[2] ? 'VERIFIED' : 'FAILED'}`);
console.log(`DATABASE_MAJOR=${identity[0]?.[2]?.match(/^\d+/)?.[0] ?? 'UNKNOWN'}`);
console.log(`AUTH_USERS=${counts['auth.users']}`);
console.log(`AGENCIES=${counts['public.agencies']}`);
console.log(`AGENTS=${counts['public.agents']}`);
console.log(`BUSINESS_TABLES_EMPTY=${businessEmpty}`);
console.log(`MEMBERSHIP_INVARIANT=${constraint[0]?.[0] === '1' ? 'VERIFIED' : 'FAILED'}`);
console.log(`METADATA_CONSISTENT=${inconsistent.is_consistent === true}`);
console.log(`INCONSISTENT_OBJECTS=${inconsistent.inconsistent_objects?.length ?? 'UNKNOWN'}`);
console.log(`METADATA_SHA256=${metadataHash}`);

if (identity.length !== 1 || !identity[0]?.[2] || counts['auth.users'] !== '2' || counts['public.agencies'] !== '2' || counts['public.agents'] !== '2' || !businessEmpty || constraint[0]?.[0] !== '1' || inconsistent.is_consistent !== true) process.exitCode = 1;
