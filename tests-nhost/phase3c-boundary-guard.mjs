import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const migration = read('nhost/migrations/default/20260906120000_phase3c_public_intake_guards/up.sql');
const rollback = read('nhost/migrations/default/20260906120000_phase3c_public_intake_guards/down.sql');
const server = read('lib/nhost/server.ts');
const client = read('lib/public-intake.ts');
const netlify = read('netlify.toml');
const routes = ['leads','candidates','appointments'].map((name) => read(`app/api/public/${name}/route.ts`)).join('\n');

for (const table of ['leads','candidates','appointments']) {
  assert.match(migration, new RegExp(`ALTER TABLE public\\.${table}`), `idempotency migration missing ${table}`);
  assert.match(migration, new RegExp(`${table}_agency_id_idempotency_key_key`), `tenant uniqueness missing ${table}`);
  assert.match(rollback, new RegExp(`DROP CONSTRAINT ${table}_agency_id_idempotency_key_key`), `rollback missing ${table}`);
}
assert.equal((migration.match(/ADD COLUMN idempotency_key uuid/g) ?? []).length, 3);
assert.equal((migration.match(/ADD COLUMN idempotency_fingerprint text/g) ?? []).length, 3);
assert.doesNotMatch(migration, /ALTER TABLE public\.(?!leads\b|candidates\b|appointments\b)/, 'migration exceeds its authorized table scope');
assert.match(server, /createHash\('sha256'\)/, 'server fingerprint is missing');
assert.match(server, /IDEMPOTENCY_CONFLICT/, 'payload-conflict path is missing');
assert.equal((server.match(/on_conflict:/g) ?? []).length, 3);
assert.match(client, /crypto\.randomUUID\(\)/, 'browser-generated opaque idempotency key is missing');
assert.match(routes, /Idempotency key is required/, 'Nhost routes must fail closed without a key');
assert.match(netlify, /from = "\/api\/public\/\*"/);
assert.match(netlify, /aggregate_by = \["ip", "domain"\]/);
assert.match(netlify, /window_limit = 20/);
assert.match(read('lib/repo/index.ts'), /process\.env\.NEXT_PUBLIC_DATA_MODE \?\? 'demo'/);
assert.match(read('lib/repo/index.ts'), /dataMode === 'nhost'[\s\S]+: demoRepository/);

console.log('DURABLE_IDEMPOTENCY_SCOPE=3_TABLES_ONLY');
console.log('IDEMPOTENCY_CONFLICT=409');
console.log('CONCURRENT_DUPLICATE_GUARD=POSTGRES_UNIQUE');
console.log('NETLIFY_RATE_LIMIT_RULE=IP_AND_DOMAIN');
console.log('DEFAULT_REPOSITORY_FALLBACK=DEMO');
console.log('PHASE3C_BOUNDARY_GUARD=VERIFIED');
