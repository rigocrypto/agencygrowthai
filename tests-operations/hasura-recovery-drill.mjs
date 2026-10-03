import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

function loadEnv(path) {
  if (!existsSync(path)) return {};
  return Object.fromEntries(readFileSync(path, 'utf8').split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) return [];
    let value = match[2];
    if (value.length > 1 && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))) value = value.slice(1, -1);
    return [[match[1], value]];
  }));
}

const env = { ...loadEnv('.env'), ...loadEnv('.env.local'), ...process.env };
const subdomain = env.NEXT_PUBLIC_NHOST_SUBDOMAIN;
const region = env.NEXT_PUBLIC_NHOST_REGION;
const secret = env.HASURA_ADMIN_SECRET ?? env.HASURA_GRAPHQL_ADMIN_SECRET ?? env.NHOST_ADMIN_SECRET;
if (!subdomain || !region || !secret) throw new Error('NHOST_ADMIN_CONFIGURATION_NOT_PRESENT');
const base = `https://${subdomain}.hasura.${region}.nhost.run`;
const headers = { 'content-type': 'application/json', 'x-hasura-admin-secret': secret };
const tables = [
  'agencies', 'settings', 'campaigns', 'campaign_events', 'agents', 'leads', 'lead_events',
  'appointments', 'candidates', 'candidate_events', 'content_assets', 'content_reviews',
  'ai_interactions', 'consents', 'audit_logs',
];
const migrations = [
  'nhost/migrations/default/20260905000000_agencygrowthai_base_schema/up.sql',
  'nhost/migrations/default/20260906000000_enforce_single_agency_membership/up.sql',
  'nhost/migrations/default/20260906120000_phase3c_public_intake_guards/up.sql',
];
const drillStartedAt = Date.now();

async function post(path, body) {
  const response = await fetch(`${base}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`REMOTE_REQUEST_FAILED_${response.status}`);
  return { json: await response.json(), text: response.headers.get('content-type') ?? '' };
}

async function sql(statement) {
  const { json } = await post('/v2/query', { type: 'run_sql', args: { source: 'default', sql: statement, read_only: true, cascade: false } });
  if (json.result_type !== 'TuplesOk' || !Array.isArray(json.result)) throw new Error('UNEXPECTED_SQL_RESPONSE');
  return json.result.slice(1);
}

const snapshot = {
  format: 'agencygrowthai-public-snapshot-v1',
  created_at: new Date().toISOString(),
  source_access: 'hasura_run_sql_read_only',
  schema: 'public',
  migration_sha256: Object.fromEntries(migrations.map((path) => [path, createHash('sha256').update(readFileSync(path)).digest('hex')])),
  metadata: (await post('/v1/metadata', { type: 'export_metadata', args: {} })).json,
  tables: {},
};

for (const table of tables) {
  const rows = await sql(`SELECT COALESCE(json_agg(row_to_json(t) ORDER BY id), '[]'::json)::text FROM public.${table} t;`);
  snapshot.tables[table] = JSON.parse(rows[0]?.[0] ?? '[]');
}

const recoveryRoot = resolve(join(tmpdir(), 'agencygrowth-phase4-recovery'));
if (!recoveryRoot.startsWith(resolve(tmpdir()))) throw new Error('UNSAFE_RECOVERY_DIRECTORY');
mkdirSync(recoveryRoot, { recursive: true });
const stamp = snapshot.created_at.replace(/[-:.]/g, '').replace('Z', 'Z');
const snapshotPath = join(recoveryRoot, `agencygrowth-public-${stamp}.json`);
const snapshotText = JSON.stringify(snapshot);
writeFileSync(snapshotPath, snapshotText, { encoding: 'utf8', mode: 0o600 });
const snapshotHash = createHash('sha256').update(snapshotText).digest('hex').toUpperCase();
const backupAcquiredAt = Date.now();

const sqlQuote = (value) => JSON.stringify(value).replaceAll("'", "''");
const userIds = [...new Set([
  ...snapshot.tables.agents.map((row) => row.user_id),
  ...snapshot.tables.ai_interactions.map((row) => row.user_id),
  ...snapshot.tables.audit_logs.map((row) => row.user_id),
].filter(Boolean))];
const preludePath = join(recoveryRoot, 'phase4-prelude.sql');
const dataPath = join(recoveryRoot, 'phase4-data.sql');
writeFileSync(preludePath, `CREATE SCHEMA auth; CREATE TABLE auth.users (id uuid PRIMARY KEY);\n${userIds.map((id) => `INSERT INTO auth.users(id) VALUES ('${id}'::uuid);`).join('\n')}\n`);
writeFileSync(dataPath, `BEGIN;\n${tables.map((table) => `INSERT INTO public.${table} SELECT * FROM jsonb_populate_recordset(NULL::public.${table}, '${sqlQuote(snapshot.tables[table])}'::jsonb);`).join('\n')}\nCOMMIT;\n`);

const container = `agencygrowth-phase4-restore-${randomUUID().replaceAll('-', '').slice(0, 10)}`;
const password = `phase4-${randomUUID()}`;
const restoreStartedAt = Date.now();
function docker(args, options = {}) {
  const result = spawnSync('docker', args, { encoding: 'utf8', windowsHide: true, ...options });
  if (result.status !== 0 && !options.allowFailure) throw new Error(`DOCKER_STEP_FAILED_${args[0]}_${args[1] ?? ''}`);
  return result;
}

try {
  docker(['run', '--detach', '--name', container, '--env', `POSTGRES_PASSWORD=${password}`, '--volume', `${recoveryRoot}:/recovery:ro`, '--volume', `${resolve('nhost/migrations')}:/migrations:ro`, 'postgres:14-alpine']);
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const result = docker(['exec', container, 'pg_isready', '--username', 'postgres'], { allowFailure: true });
    if (result.status === 0) { ready = true; break; }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
  }
  if (!ready) throw new Error('RESTORE_CONTAINER_NOT_READY');
  docker(['exec', '--env', `PGPASSWORD=${password}`, container, 'createdb', '--username', 'postgres', 'agencygrowth_restore']);
  const psql = (file) => docker(['exec', '--env', `PGPASSWORD=${password}`, container, 'psql', '--username', 'postgres', '--dbname', 'agencygrowth_restore', '--set', 'ON_ERROR_STOP=1', '--file', file]);
  psql('/recovery/phase4-prelude.sql');
  psql('/migrations/default/20260905000000_agencygrowthai_base_schema/up.sql');
  psql('/migrations/default/20260906000000_enforce_single_agency_membership/up.sql');
  psql('/migrations/default/20260906120000_phase3c_public_intake_guards/up.sql');
  psql('/recovery/phase4-data.sql');
  const restoreCompletedAt = Date.now();

  const validation = docker(['exec', '--env', `PGPASSWORD=${password}`, container, 'psql', '--username', 'postgres', '--dbname', 'agencygrowth_restore', '--tuples-only', '--no-align', '--command', `SELECT (SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'),(SELECT count(*) FROM public.agencies),(SELECT count(*) FROM public.agents),(${tables.filter((table) => !['agencies', 'agents'].includes(table)).map((table) => `(SELECT count(*) FROM public.${table})`).join('+')});`]);
  const values = validation.stdout.trim().split('|');
  if (values.join('|') !== '15|2|2|0') throw new Error('RESTORE_CONTENT_VALIDATION_FAILED');
  const validationCompletedAt = Date.now();

  console.log('RECOVERY_SNAPSHOT=VERIFIED');
  console.log('BACKUP_METHOD=HASURA_READ_ONLY_LOGICAL_SNAPSHOT');
  console.log('BACKUP_SCOPE=PUBLIC_SCHEMA_AND_HASURA_METADATA');
  console.log(`BACKUP_SIZE_BYTES=${Buffer.byteLength(snapshotText)}`);
  console.log(`BACKUP_SHA256=${snapshotHash}`);
  console.log('ISOLATED_RESTORE=VERIFIED');
  console.log('RESTORED_PUBLIC_TABLES=15');
  console.log('RESTORED_AGENCIES=2');
  console.log('RESTORED_AGENTS=2');
  console.log('RESTORED_BUSINESS_ROWS=0');
  console.log(`BACKUP_ACQUISITION_SECONDS=${((backupAcquiredAt - drillStartedAt) / 1000).toFixed(1)}`);
  console.log(`RESTORE_SECONDS=${((restoreCompletedAt - restoreStartedAt) / 1000).toFixed(1)}`);
  console.log(`VALIDATION_SECONDS=${((validationCompletedAt - restoreCompletedAt) / 1000).toFixed(1)}`);
  console.log(`DRILL_DURATION_SECONDS=${((validationCompletedAt - drillStartedAt) / 1000).toFixed(1)}`);
  console.log(`BACKUP_LOCATION=${snapshotPath}`);
  console.log('LIVE_NHOST_CHANGES=NONE');
} finally {
  docker(['rm', '--force', container], { allowFailure: true });
  rmSync(preludePath, { force: true });
  rmSync(dataPath, { force: true });
}
