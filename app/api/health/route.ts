import { NextResponse } from 'next/server';
import { withOperationalLogging } from '@/lib/observability/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type HealthSnapshot = {
  checkedAt: number;
  body: {
    status: 'healthy' | 'degraded';
    checks: {
      configuration: 'pass' | 'fail';
      auth: 'pass' | 'fail';
      graphql: 'pass' | 'fail';
    };
  };
};

let cached: HealthSnapshot | undefined;
const CACHE_MS = 30_000;

async function dependencyStatus(url: string): Promise<'pass' | 'fail'> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(4_000),
    });
    return response.ok ? 'pass' : 'fail';
  } catch {
    return 'fail';
  }
}

async function handleGet(): Promise<Response> {
  const now = Date.now();
  if (cached && now - cached.checkedAt < CACHE_MS) {
    return NextResponse.json(cached.body, {
      status: cached.body.status === 'healthy' ? 200 : 503,
      headers: { 'cache-control': 'no-store' },
    });
  }

  const subdomain = process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN?.trim();
  const region = process.env.NEXT_PUBLIC_NHOST_REGION?.trim();
  const configured = Boolean(subdomain && region && process.env.NEXT_PUBLIC_DATA_MODE === 'nhost');
  const [auth, graphql] = configured
    ? await Promise.all([
      dependencyStatus(`https://${subdomain}.auth.${region}.nhost.run/v1/healthz`),
      dependencyStatus(`https://${subdomain}.hasura.${region}.nhost.run/healthz`),
    ])
    : ['fail', 'fail'] as const;

  const checks = { configuration: configured ? 'pass' as const : 'fail' as const, auth, graphql };
  const body: HealthSnapshot['body'] = {
    status: Object.values(checks).every((value) => value === 'pass') ? 'healthy' : 'degraded',
    checks,
  };
  cached = { checkedAt: now, body };

  return NextResponse.json(body, {
    status: body.status === 'healthy' ? 200 : 503,
    headers: { 'cache-control': 'no-store' },
  });
}

export const GET = withOperationalLogging('/api/health', handleGet);
