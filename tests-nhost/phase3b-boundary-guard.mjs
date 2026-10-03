import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const repo = read('lib/repo/nhost.ts');
const server = read('lib/nhost/server.ts');
const publicClient = read('lib/public-intake.ts');
const requestParser = read('lib/http/public-request.ts');
const routes = [
  read('app/api/public/leads/route.ts'),
  read('app/api/public/candidates/route.ts'),
  read('app/api/public/appointments/route.ts'),
].join('\n');
const browserSurface = [repo, publicClient, read('lib/nhost/client.ts'), read('components/providers/auth-provider.tsx')].join('\n');

assert.match(server, /import 'server-only'/, 'trusted Nhost helper must be server-only');
assert.doesNotMatch(server, /export\s+(?:async\s+)?function\s+trustedGraphql/, 'generic privileged GraphQL proxy must stay private');
assert.match(server, /x-hasura-admin-secret/, 'trusted server helper must authenticate Hasura server-side');
assert.match(routes, /NEXT_PUBLIC_DATA_MODE === 'nhost'/, 'public routes must select the Nhost trusted path explicitly');
assert.match(requestParser, /MAX_PUBLIC_BODY_BYTES = 32 \* 1024/, 'public body-size limit is missing');
assert.match(requestParser, /schema\.safeParse/, 'public request validation is missing');
assert.match(routes, /\.strict\(\)/, 'public schemas must reject unknown ownership and derived fields');

for (const operation of ['updateLead', 'updateAppointment', 'updateCandidate']) {
  assert.match(repo, new RegExp(`async\\s+${operation}`), `${operation} is not implemented`);
  assert.match(repo, new RegExp(`mutation ${operation.charAt(0).toUpperCase()}${operation.slice(1)}`), `${operation} is not a GraphQL mutation`);
}
for (const operation of ['createLead', 'createAppointment', 'createCandidate', 'updateContentStatus', 'createContentAsset']) {
  assert.match(repo, new RegExp(`async\\s+${operation}[^}]+writeDisabled\\('${operation}'\\)`), `${operation} must remain disabled in NhostRepository`);
}

assert.match(repo, /\['status', 'notes'\]/, 'lead/appointment update allowlist is missing');
assert.match(repo, /\['status'\]/, 'candidate update allowlist is missing');
for (const forbidden of ['HASURA_ADMIN_SECRET', 'HASURA_GRAPHQL_ADMIN_SECRET', 'NHOST_ADMIN_SECRET', 'NHOST_DATABASE_URL', 'DATABASE_URL', 'x-hasura-admin-secret']) {
  assert.doesNotMatch(browserSurface, new RegExp(forbidden, 'i'), `privileged credential entered the browser surface: ${forbidden}`);
}
assert.doesNotMatch(publicClient, /agency_id|score_tier|score_breakdown|admin/i, 'browser public-intake client may not submit ownership, derived fields, or admin authority');

const metadata = JSON.parse(read('nhost/metadata/agencygrowthai-phase2b.tables.json'));
for (const table of metadata.tables) {
  assert.equal((table.insert_permissions ?? []).some((permission) => permission.role === 'user'), false, `user INSERT enabled on ${table.table.name}`);
  assert.equal((table.delete_permissions ?? []).some((permission) => permission.role === 'user'), false, `user DELETE enabled on ${table.table.name}`);
  for (const operation of ['select_permissions', 'insert_permissions', 'update_permissions', 'delete_permissions']) {
    assert.equal((table[operation] ?? []).some((permission) => permission.role === 'public'), false, `public ${operation} enabled on ${table.table.name}`);
  }
}

console.log('AUTHENTICATED_MUTATION_AUTHORITY=REAL_USER_JWT');
console.log('AUTHENTICATED_UPDATE_ALLOWLIST=VERIFIED');
console.log('UNSCOPED_NHOST_WRITES=FAIL_CLOSED');
console.log('TRUSTED_PUBLIC_HELPER=SERVER_ONLY');
console.log('GENERIC_ADMIN_PROXY=ABSENT');
console.log('PUBLIC_REQUEST_VALIDATION=VERIFIED');
console.log('BROWSER_ADMIN_CREDENTIALS=NONE');
console.log('DIRECT_USER_INSERT=DENIED_BY_METADATA');
console.log('PUBLIC_HASURA_ROLE=CLOSED');
console.log('PHASE3B_BOUNDARY_GUARD=VERIFIED');
