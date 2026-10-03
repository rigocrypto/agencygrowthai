# Phase 3B write boundaries

## Authority split

- Authenticated dashboard updates use the real Nhost access token through `@nhost/nhost-js`.
- `updateLead` accepts only `status` and `notes`.
- `updateAppointment` accepts only `status` and `notes`.
- `updateCandidate` accepts only `status`.
- All tenant and identity columns remain unavailable to browser writes.
- NhostRepository create operations and content writes remain fail-closed.
- Anonymous intake uses three narrow Next.js server routes and a private `server-only` Hasura helper. There is no generic privileged GraphQL proxy.

## Public intake controls

- JSON only, strict allowlists, field-length constraints, and a 32 KiB body limit.
- Agency ownership is resolved server-side from `public_slug`.
- Lead and candidate scores are recomputed server-side.
- Lead consent method/text and timestamp are server controlled.
- Appointment creation verifies that the referenced lead belongs to the resolved agency.
- Responses are sanitized and never expose Hasura errors or credentials.

## Explicit pilot gaps

- Durable distributed rate limiting is not implemented. It must be supplied at the deployment edge before a public pilot.
- Durable idempotency/replay protection is not implemented because the current schema has no idempotency key. Duplicate valid submissions create distinct rows.
- These gaps do not broaden database authority, but they are abuse/operability blockers for Phase 3C acceptance.
