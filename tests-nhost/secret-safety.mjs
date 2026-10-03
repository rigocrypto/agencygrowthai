import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

function env(path) {
  const output = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    let value = match[2];
    if (value.length > 1 && ((value[0] === '"' && value.at(-1) === '"') || (value[0] === "'" && value.at(-1) === "'"))) value = value.slice(1, -1);
    output[match[1]] = value;
  }
  return output;
}

const local = { ...env('.env'), ...env('.env.test.local') };
const sensitiveValues = Object.entries(local)
  .filter(([key, value]) => /(SECRET|PASSWORD|TOKEN|DATABASE_URL|POSTGRES_URL|SERVICE_ROLE)/i.test(key) && value.length >= 8)
  .map(([, value]) => value);
const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' })
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((path) => !path.startsWith('.git/') && !path.startsWith('node_modules/'));

const hits = [];
const tokenPrefix = ['e', 'y', 'J'].join('');
for (const file of files) {
  let content;
  try { content = readFileSync(file, 'utf8'); } catch { continue; }
  if (sensitiveValues.some((value) => content.includes(value))) hits.push(file);
  if (content.includes(tokenPrefix) && /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/.test(content)) hits.push(file);
  if (/postgres(?:ql)?:\/\/[^\s:@/]+:[^\s@/]+@/i.test(content)) hits.push(file);
}

const trackedEnv = execFileSync('git', ['ls-files', '.env', '.env.local', '.env.test.local'], { encoding: 'utf8' }).trim();
if (trackedEnv) throw new Error('A local environment file is tracked');
if (hits.length) throw new Error(`Secret-like value detected in source (${new Set(hits).size} file(s))`);

console.log('TRACKED_LOCAL_ENV_FILES=0');
console.log('LOCAL_SECRET_VALUE_HITS=0');
console.log('JWT_LITERAL_HITS=0');
console.log('DATABASE_CREDENTIAL_URI_HITS=0');
console.log('SECRET_SAFETY=VERIFIED');
