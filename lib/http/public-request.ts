import 'server-only';

import { NextResponse } from 'next/server';
import type { ZodType } from 'zod';

export const MAX_PUBLIC_BODY_BYTES = 32 * 1024;

export async function parsePublicRequest<T>(request: Request, schema: ZodType<T>): Promise<
  | { ok: true; value: T }
  | { ok: false; response: NextResponse }
> {
  const contentType = request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
  if (contentType !== 'application/json') {
    return { ok: false, response: NextResponse.json({ error: 'Content-Type must be application/json.' }, { status: 415 }) };
  }
  const declaredLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declaredLength) && declaredLength > MAX_PUBLIC_BODY_BYTES) {
    return { ok: false, response: NextResponse.json({ error: 'Request body is too large.' }, { status: 413 }) };
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    return { ok: false, response: NextResponse.json({ error: 'Malformed request body.' }, { status: 400 }) };
  }
  if (new TextEncoder().encode(text).byteLength > MAX_PUBLIC_BODY_BYTES) {
    return { ok: false, response: NextResponse.json({ error: 'Request body is too large.' }, { status: 413 }) };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, response: NextResponse.json({ error: 'Malformed request body.' }, { status: 400 }) };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, response: NextResponse.json({ error: 'Request validation failed.' }, { status: 400 }) };
  }
  return { ok: true, value: parsed.data };
}

export function trustedNhostFailure(error: unknown): NextResponse {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  if (code === 'UNKNOWN_AGENCY') return NextResponse.json({ error: 'Unknown agency.' }, { status: 404 });
  if (code === 'LEAD_NOT_FOUND') return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });
  if (code === 'IDEMPOTENCY_CONFLICT') return NextResponse.json({ error: 'Idempotency key was already used for a different request.' }, { status: 409 });
  if (code === 'NOT_CONFIGURED') return NextResponse.json({ error: 'Public intake is not configured.' }, { status: 503 });
  return NextResponse.json({ error: 'Could not process the request.' }, { status: 500 });
}
