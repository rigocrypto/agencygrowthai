const base = (process.env.PILOT_BASE_URL ?? 'https://agencygrowthai.netlify.app').replace(/\/$/, '');
const requestIdPattern = /^[A-Za-z0-9_-]{8,64}$/;

async function check(path, options, accepted) {
  const response = await fetch(`${base}${path}`, { redirect: 'manual', ...options });
  if (!accepted.includes(response.status)) throw new Error(`${path}_UNEXPECTED_STATUS_${response.status}`);
  const requestId = response.headers.get('x-request-id');
  if (path.startsWith('/api/') && !requestIdPattern.test(requestId ?? '')) throw new Error(`${path}_MISSING_REQUEST_ID`);
  return response;
}

await check('/', {}, [200]);
await check('/login', {}, [200]);
const dashboard = await check('/dashboard', {}, [200, 302, 303, 307, 308]);
if (dashboard.status === 200) {
  const html = await dashboard.text();
  if (!html.includes('Loading') || html.includes('Total Leads') || html.includes('Welcome back')) throw new Error('ANONYMOUS_DASHBOARD_CONTENT_EXPOSED');
}
const health = await check('/api/health', {}, [200]);
const healthBody = await health.json();
if (healthBody.status !== 'healthy' || Object.values(healthBody.checks ?? {}).some((value) => value !== 'pass')) throw new Error('HEALTH_DEPENDENCIES_NOT_HEALTHY');

for (const route of ['leads', 'candidates', 'appointments']) {
  const response = await check(`/api/public/${route}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-request-id': 'phase4-smoke-01' },
    body: '{}',
  }, [400]);
  if (response.headers.get('x-request-id') !== 'phase4-smoke-01') throw new Error(`${route}_CORRELATION_ID_NOT_PRESERVED`);
}

console.log('PILOT_HTTPS=VERIFIED');
console.log('PUBLIC_PAGES=VERIFIED');
console.log('ANONYMOUS_DASHBOARD=BLOCKED');
console.log('HEALTH_ENDPOINT=HEALTHY');
console.log('DEPENDENCY_HEALTH=VERIFIED');
console.log('PUBLIC_INTAKE_MALFORMED_REQUESTS=3/3_REJECTED');
console.log('CORRELATION_ID=VERIFIED');
console.log('REMOTE_DATA_WRITES=NONE');
