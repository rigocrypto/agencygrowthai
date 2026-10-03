import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const packageJson = JSON.parse(read('package.json'));
const repo = read('lib/repo/nhost.ts');
const selector = read('lib/repo/index.ts');
const client = read('lib/nhost/client.ts');
const auth = read('components/providers/auth-provider.tsx');
const phase3Source = [repo, selector, client, auth].join('\n');

if (packageJson.dependencies?.['@nhost/nhost-js'] !== '4.8.0') throw new Error('Nhost SDK is not pinned to 4.8.0');
for (const operation of [
  'getAgency', 'getAgents', 'getLeads', 'getLead', 'getLeadEvents', 'getAppointments',
  'getAppointmentsByLead', 'getCandidates', 'getCandidate', 'getCandidateEvents',
  'getCampaigns', 'getContentAssets', 'getAuditLogs', 'getDashboardMetrics',
]) if (!repo.includes(operation)) throw new Error(`Missing Nhost read method: ${operation}`);

for (const operation of [
  'createLead', 'createAppointment', 'createCandidate', 'updateContentStatus', 'createContentAsset',
]) {
  const method = new RegExp(`async\\s+${operation}[^}]+writeDisabled\\('${operation}'\\)`);
  if (!method.test(repo)) throw new Error(`Nhost write does not fail closed: ${operation}`);
}

for (const operation of ['updateLead', 'updateAppointment', 'updateCandidate']) {
  if (!repo.includes(`mutation ${operation.charAt(0).toUpperCase()}${operation.slice(1)}`)) {
    throw new Error(`Nhost scoped update is absent: ${operation}`);
  }
}

if (!repo.includes('NHOST_SESSION_REQUIRED') || !repo.includes('NHOST_GRAPHQL_ERROR')) throw new Error('Nhost error classes are not explicit');
if (!selector.includes("process.env.NEXT_PUBLIC_DATA_MODE ?? 'demo'")) throw new Error('Default repository is no longer demo');
if (!selector.includes("dataMode === 'nhost'")) throw new Error('Explicit Nhost repository mode is absent');
if (repo.includes('agencyId') || repo.includes('$agency')) throw new Error('Browser-supplied agency boundary detected');
if (!client.includes('NEXT_PUBLIC_NHOST_SUBDOMAIN') || !client.includes('NEXT_PUBLIC_NHOST_REGION')) throw new Error('Public Nhost coordinates are not environment-driven');
if (!auth.includes("effectiveRole !== 'user'") || !auth.includes("boundUserId !== nhostUser.id")) throw new Error('JWT role or identity binding is absent');

for (const forbidden of ['HASURA_ADMIN_SECRET', 'HASURA_GRAPHQL_ADMIN_SECRET', 'NHOST_ADMIN_SECRET', 'NHOST_DATABASE_URL', 'DATABASE_URL']) {
  if (phase3Source.includes(forbidden)) throw new Error(`Privileged credential name entered the application read path: ${forbidden}`);
}

for (const envFile of ['.env', '.env.local', '.env.test.local']) {
  const ignored = execFileSync('git', ['check-ignore', envFile], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  const tracked = execFileSync('git', ['ls-files', envFile], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  if (!ignored || tracked) throw new Error(`Unsafe local environment file: ${envFile}`);
}

console.log('NHOST_SDK_PIN=VERIFIED');
console.log('NHOST_READ_CONTRACT=VERIFIED');
console.log('NHOST_UNSCOPED_WRITES_FAIL_CLOSED=VERIFIED');
console.log('DEFAULT_REPOSITORY_DEMO=VERIFIED');
console.log('DASHBOARD_READ_AUTHORITY_USER_JWT=VERIFIED');
console.log('CLIENT_ADMIN_CREDENTIALS=NONE');
console.log('PHASE3A_BOUNDARY_GUARD=VERIFIED');
