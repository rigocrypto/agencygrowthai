import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
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

function filesUnder(root) {
  if (!existsSync(root)) return [];
  const files = [];
  const visit = (path) => {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      if (entry.name === 'node_modules') continue;
      const child = join(path, entry.name);
      if (entry.isDirectory()) visit(child);
      else if (entry.isFile() && statSync(child).size <= 50 * 1024 * 1024) files.push(child);
    }
  };
  visit(root);
  return files;
}

const env = { ...loadEnv('.env'), ...loadEnv('.env.local'), ...loadEnv('.env.test.local') };
const password = env.TENANT_TEST_A_PASSWORD ?? '';
const email = env.TENANT_TEST_A_EMAIL ?? '';
if (password.length < 8 || !email) throw new Error('USER_A_LOCAL_CREDENTIAL_NOT_PRESENT');
const sensitiveValues = Object.entries(env)
  .filter(([key, value]) => /(SECRET|PASSWORD|TOKEN|DATABASE_URL|POSTGRES_URL|SERVICE_ROLE)/i.test(key) && value.length >= 8)
  .map(([, value]) => value);

const roots = ['test-results', 'playwright-report', 'blob-report', 'screenshots', 'traces', 'videos', 'tmp', '.next', '.netlify'];
const files = roots.flatMap(filesUnder);
let passwordHits = 0;
let credentialPairHits = 0;
let jwtHits = 0;
let refreshTokenMarkers = 0;
let secretValueHits = 0;
let databaseCredentialHits = 0;
for (const file of files) {
  let content;
  try { content = readFileSync(file, 'utf8'); } catch { continue; }
  if (content.includes(password)) passwordHits += 1;
  if (content.includes(password) && content.includes(email)) credentialPairHits += 1;
  if (/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/.test(content)) jwtHits += 1;
  if (/refresh[_-]?token/i.test(content)) refreshTokenMarkers += 1;
  if (sensitiveValues.some((value) => content.includes(value))) secretValueHits += 1;
  if (/postgres(?:ql)?:\/\/[^\s:@/]+:[^\s@/]+@/i.test(content)) databaseCredentialHits += 1;
}

const revisions = spawnSync('git', ['rev-list', '--all'], { encoding: 'utf8', windowsHide: true });
if (revisions.status !== 0) throw new Error('GIT_HISTORY_SCAN_FAILED');
let historyPasswordHits = 0;
for (const revision of revisions.stdout.trim().split(/\r?\n/).filter(Boolean)) {
  const archive = spawnSync('git', ['archive', '--format=tar', revision], { encoding: null, maxBuffer: 64 * 1024 * 1024, windowsHide: true });
  if (archive.status !== 0) throw new Error('GIT_HISTORY_SCAN_FAILED');
  if (archive.stdout.includes(Buffer.from(password))) historyPasswordHits += 1;
}
const historyCredentialPairHits = historyPasswordHits ? 1 : 0;

console.log(`GENERATED_ARTIFACTS_SCANNED=${files.length}`);
console.log(`EXPOSED_PASSWORD_ARTIFACT_HITS=${passwordHits}`);
console.log(`EMAIL_PASSWORD_ARTIFACT_HITS=${credentialPairHits}`);
console.log(`JWT_ARTIFACT_HITS=${jwtHits}`);
console.log(`REFRESH_TOKEN_MARKER_HITS=${refreshTokenMarkers}`);
console.log(`GENERATED_ARTIFACT_SECRET_VALUE_HITS=${secretValueHits}`);
console.log(`DATABASE_CREDENTIAL_ARTIFACT_HITS=${databaseCredentialHits}`);
console.log(`PASSWORD_GIT_HISTORY_HITS=${historyPasswordHits}`);
console.log(`CREDENTIAL_PAIR_GIT_HISTORY_HITS=${historyCredentialPairHits}`);

if (passwordHits || credentialPairHits || jwtHits || secretValueHits || databaseCredentialHits || historyPasswordHits || historyCredentialPairHits) process.exitCode = 1;
