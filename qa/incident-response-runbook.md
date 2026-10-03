# Incident response runbook

## Severity

- **SEV-1:** complete outage, confirmed/suspected cross-tenant access, secret/admin compromise, uncontrolled data loss, or authorization-boundary failure.
- **SEV-2:** Auth/GraphQL/public intake unavailable or major sustained degradation without evidence of tenant crossing.
- **SEV-3:** partial degradation, elevated expected errors/429s, optional integration failure, or non-critical operational issue.

## Lifecycle

1. Detection: record alert/synthetic/log signal, UTC time, route, status class, correlation ID, deploy ID, and reporter. Never copy payloads, tokens, emails, phones, or credentials.
2. Triage: assign incident owner and communications lead; confirm scope with a second signal; distinguish client 4xx from platform failure.
3. Contain: stop the narrowest affected write path or rollback the deploy. Tenant-isolation suspicion is SEV-1; restrict access before investigation and never loosen permissions.
4. Diagnose: correlate Netlify deploy/function logs, `/api/health`, Nhost service health/logs if available, Hasura metadata consistency, and safe database counts.
5. Recover: follow the relevant Auth, GraphQL, intake, rollback, or database runbook. Obtain explicit approval for destructive/live actions.
6. Validate: critical journeys, tenant security, metadata hash/consistency, zero unexpected rows, secret scan, and deployed mode.
7. Communicate: initial notice, material updates, recovery, residual risk, and closure. Preserve logs/checksums/IDs before cleanup.
8. Review: timeline, root cause, customer/security impact, control effectiveness, action owner/due date, and SLO/error-budget impact.

The incident owner may declare closure only after validation evidence and ownership of every follow-up gap.
