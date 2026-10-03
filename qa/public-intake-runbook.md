# Public intake runbook

Applies to Financial Checkup leads, candidates, and appointments. Logs must use only route, status, duration, safe error code, request ID, and deploy ID.

| Signal | Meaning/action |
| --- | --- |
| 400 | Invalid request; investigate only if sustained across valid clients. |
| 404 | Unknown agency/lead; expected for bad references; check configuration if widespread. |
| 409 | Idempotency key reused with different input; client/retry issue unless spiking. |
| 413 | Body guard working; sustained volume may be abuse. |
| 429 | Netlify rate limiter working; use Observability/rate-limit evidence and check burst source without recording PII. |
| 500/503 | Upstream/configuration failure; SEV-2 when sustained for valid traffic. |

Triage with a correlation ID, `/api/health`, current deploy/logs, configuration-name presence, Nhost health, Hasura metadata consistency, and safe malformed-request probes. Never replay a real submission or print the Financial Checkup body. Do not enable direct browser inserts or make `agency_id` writable.

Recovery requires valid synthetic submissions in create-test-clean tests, durable idempotency, body/rate guards, zero residual fixtures, tenant suite, and confirmation that audit/event forgery remains blocked. The optional 21YunBox integration is preserved and non-blocking; its failure alone is not an AgencyGrowthAI outage.
