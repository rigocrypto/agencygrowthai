# Nhost Auth outage runbook

1. Reproduce with a safe request and check `/api/health`; do not log credentials or sessions.
2. A single `invalid email/password` means bad credentials, not an outage. Verification-required is a normal account state. Multiple known-good synthetic failures plus Auth health/log failure indicate provider degradation.
3. Check Netlify deploy changes, client configuration names, Nhost Auth health/Dashboard logs where available, DNS/TLS, and token/session expiration behavior. Never decode or paste tokens into tickets.
4. If only the latest deploy fails, follow the Netlify rollback runbook. If Nhost Auth is degraded, declare SEV-2, pause authenticated acceptance tests, preserve existing sessions, and communicate. Do not bypass verification or edit `auth.users`.
5. Recovery requires successful real login, session presence, JWT user-ID binding, effective role `user`, logout/session invalidation, dashboard protection, and tenant isolation.

Compensating signal while project Auth metrics/alerts are unverified: `/api/health`, controlled synthetic login executed with ignored local credentials, sanitized application errors, and Nhost service logs when available.
