import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function readEnv(path) {
  if (!existsSync(path)) return {};
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

const local = {
  ...readEnv('.env'),
  ...readEnv('.env.local'),
  ...readEnv('.env.test.local'),
};
const sensitiveValues = Object.entries(local)
  .filter(([key, value]) => /(SECRET|PASSWORD|TOKEN|DATABASE_URL|POSTGRES_URL|SERVICE_ROLE)/i.test(key) && value.length >= 8)
  .map(([, value]) => value);
const browserFiles = filesUnder('.next/static');
const generatedFiles = [...browserFiles, ...filesUnder('.netlify')];
let browserSecretHits = 0;
let generatedSecretHits = 0;
let jwtLiteralHits = 0;
let databaseCredentialHits = 0;

for (const file of generatedFiles) {
  let content;
  try { content = readFileSync(file, 'utf8'); } catch { continue; }
  const hasSecret = sensitiveValues.some((value) => content.includes(value));
  if (hasSecret) {
    generatedSecretHits += 1;
    if (file.startsWith(join('.next', 'static'))) browserSecretHits += 1;
  }
  if (/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/.test(content)) jwtLiteralHits += 1;
  if (/postgres(?:ql)?:\/\/[^\s:@/]+:[^\s@/]+@/i.test(content)) databaseCredentialHits += 1;
}

console.log(`BROWSER_FILES_SCANNED=${browserFiles.length}`);
console.log(`GENERATED_FILES_SCANNED=${generatedFiles.length}`);
console.log(`BROWSER_SECRET_VALUE_HITS=${browserSecretHits}`);
console.log(`GENERATED_SECRET_VALUE_HITS=${generatedSecretHits}`);
console.log(`HARDCODED_JWT_HITS=${jwtLiteralHits}`);
console.log(`DATABASE_CREDENTIAL_HITS=${databaseCredentialHits}`);
if (browserSecretHits || generatedSecretHits || jwtLiteralHits || databaseCredentialHits) {
  throw new Error('Secret-like material detected in generated production artifacts');
}
console.log('PRODUCTION_BUNDLE_SECRET_SAFETY=VERIFIED');
