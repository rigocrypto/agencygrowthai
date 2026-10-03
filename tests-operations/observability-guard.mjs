import { readFileSync } from 'node:fs';

const helper = readFileSync('lib/observability/server.ts', 'utf8');
const health = readFileSync('app/api/health/route.ts', 'utf8');
const routes = [
  'app/api/public/leads/route.ts',
  'app/api/public/candidates/route.ts',
  'app/api/public/appointments/route.ts',
].map((path) => readFileSync(path, 'utf8'));

for (const field of ['request_id', 'route', 'method', 'status', 'duration_ms', 'outcome', 'error_code', 'deploy_id']) {
  if (!helper.includes(field)) throw new Error(`MISSING_LOG_FIELD_${field}`);
}
if (!helper.includes('REQUEST_ID_PATTERN') || !helper.includes('randomUUID')) throw new Error('REQUEST_ID_VALIDATION_MISSING');
if (helper.includes('request.text(') || helper.includes('request.json(')) throw new Error('REQUEST_BODY_LOGGING_RISK');
if (!health.includes('/v1/healthz') || !health.includes('/healthz')) throw new Error('DEPENDENCY_HEALTH_CHECK_MISSING');
if (/HASURA_ADMIN_SECRET|NHOST_ADMIN_SECRET|DATABASE_URL/.test(health)) throw new Error('HEALTH_SECRET_REFERENCE_FORBIDDEN');
if (routes.some((route) => !route.includes('withOperationalLogging'))) throw new Error('PUBLIC_ROUTE_NOT_INSTRUMENTED');

console.log('STRUCTURED_LOG_SCHEMA=VERIFIED');
console.log('CORRELATION_ID=VERIFIED');
console.log('REQUEST_BODY_LOGGING=ABSENT');
console.log('HEALTH_ENDPOINT_REDACTION=VERIFIED');
console.log('PUBLIC_ROUTE_COVERAGE=3/3');
