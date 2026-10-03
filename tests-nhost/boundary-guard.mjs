import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const path = 'nhost/metadata/agencygrowthai-phase2b.tables.json';
const metadata = JSON.parse(readFileSync(path, 'utf8'));
const tables = metadata.tables;
const forbiddenUpdateColumns = new Set(['agency_id', 'user_id', 'agent_id', 'role', 'id', 'created_at', 'created_by', 'score', 'score_tier', 'score_breakdown']);
const expectedUpdates = new Map([
  ['leads', ['notes', 'status']],
  ['appointments', ['notes', 'status']],
  ['candidates', ['status']],
]);

assert.equal(tables.length, 15, 'all 15 AgencyGrowthAI tables must be represented');
for (const table of tables) {
  const name = table.table.name;
  for (const operation of ['select_permissions', 'insert_permissions', 'update_permissions', 'delete_permissions']) {
    assert.equal((table[operation] ?? []).some((permission) => permission.role === 'public'), false, `public ${operation} forbidden on ${name}`);
  }
  assert.equal((table.insert_permissions ?? []).some((permission) => permission.role === 'user'), false, `user INSERT forbidden on ${name}`);
  assert.equal((table.delete_permissions ?? []).some((permission) => permission.role === 'user'), false, `user DELETE forbidden on ${name}`);
  const select = (table.select_permissions ?? []).find((permission) => permission.role === 'user');
  assert.ok(select, `scoped user SELECT required on ${name}`);
  const filter = JSON.stringify(select.permission.filter);
  assert.notEqual(filter, '{}', `unscoped user SELECT forbidden on ${name}`);
  assert.match(filter, /X-Hasura-User-Id/, `JWT user binding required on ${name}`);
  assert.match(filter, /agents_by_agency_id/, `membership relationship required on ${name}`);
  const update = (table.update_permissions ?? []).find((permission) => permission.role === 'user');
  if (!expectedUpdates.has(name)) {
    assert.equal(update, undefined, `unexpected user UPDATE on ${name}`);
    continue;
  }
  assert.deepEqual([...update.permission.columns].sort(), expectedUpdates.get(name), `unexpected update columns on ${name}`);
  for (const column of update.permission.columns) assert.equal(forbiddenUpdateColumns.has(column), false, `forbidden writable column ${name}.${column}`);
  assert.match(JSON.stringify(update.permission.filter), /X-Hasura-User-Id/);
  assert.match(JSON.stringify(update.permission.check), /X-Hasura-User-Id/);
}

const raw = readFileSync(path, 'utf8');
assert.doesNotMatch(raw, /x-hasura-admin-secret|postgres(?:ql)?:\/\/|refreshToken|accessToken/i, 'secret-like material forbidden');
console.log('STATIC_BOUNDARY_GUARDS=VERIFIED');
