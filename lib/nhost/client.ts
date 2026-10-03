'use client';

import { createClient, type NhostClient } from '@nhost/nhost-js';

const subdomain = process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN ?? '';
const region = process.env.NEXT_PUBLIC_NHOST_REGION ?? '';

export const isNhostConfigured = Boolean(subdomain && region);

let browserClient: NhostClient | null = null;

/**
 * Returns the browser-scoped Nhost client used by authentication and GraphQL reads.
 * The SDK's client-side middleware owns session persistence, refresh, and JWT
 * attachment. No administrative credential is accepted by this module.
 */
export function getNhostBrowserClient(): NhostClient {
  if (!isNhostConfigured) {
    throw new Error(
      'Nhost is not configured — NEXT_PUBLIC_NHOST_SUBDOMAIN and NEXT_PUBLIC_NHOST_REGION are required.'
    );
  }

  if (typeof window === 'undefined') {
    throw new Error('The Phase 3A Nhost client is browser-only.');
  }

  browserClient ??= createClient({ subdomain, region });
  return browserClient;
}
