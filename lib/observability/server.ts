import 'server-only';

import { randomUUID } from 'node:crypto';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

type RouteHandler = (request: Request) => Promise<Response>;

function requestIdFor(request: Request): string {
  const supplied = request.headers.get('x-request-id')?.trim();
  return supplied && REQUEST_ID_PATTERN.test(supplied) ? supplied : randomUUID();
}
function outcomeFor(status: number): 'success' | 'client_error' | 'server_error' {
  if (status >= 500) return 'server_error';
  if (status >= 400) return 'client_error';
  return 'success';
}

export function withOperationalLogging(route: string, handler: RouteHandler): RouteHandler {
  return async (request: Request): Promise<Response> => {
    const startedAt = Date.now();
    const requestId = requestIdFor(request);
    let response: Response;

    try {
      response = await handler(request);
    } catch {
      response = Response.json({ error: 'Could not process the request.' }, { status: 500 });
    }

    response.headers.set('x-request-id', requestId);
    response.headers.set('cache-control', response.headers.get('cache-control') ?? 'no-store');

    const record = {
      event: 'http_request_complete',
      timestamp: new Date().toISOString(),
      request_id: requestId,
      route,
      method: request.method,
      status: response.status,
      duration_ms: Date.now() - startedAt,
      outcome: outcomeFor(response.status),
      error_code: response.status >= 400 ? `HTTP_${response.status}` : null,
      deploy_id: process.env.DEPLOY_ID ?? process.env.COMMIT_REF ?? process.env.BUILD_ID ?? process.env.CONTEXT ?? 'unknown',
    };
    console.info(JSON.stringify(record));
    return response;
  };
}
