# Phase 4 production-readiness assessment

Assessment date: 2026-09-07. The one-agent pilot is NO-GO pending a critical framework security patch; general production is NOT READY.

## Operational inventory

- **Netlify:** actual account plan `Free`; existing site and Git deploy model; build/deploy diagnostics, Function logs (documented minimum 24 h), 24-hour Observability, 125,000 included function calls, and three enabled GitHub commit-status deploy hooks. Analytics/RUM/audit-log retention are unavailable; log drains are Enterprise. Alert delivery was not demonstrated.
- **Nhost:** project/region and PostgreSQL 14 verified. Health endpoints and Hasura admin metadata are reachable. Actual project plan, managed backups/retention/PITR/restore UI/download, project logs, managed Metrics/Grafana, resource metrics, and alerts are NOT VERIFIED because Dashboard browser access was unavailable. DNS for a project Grafana host alone is not entitlement evidence.
- **Secrets/access:** required Netlify variable names are present; values were not read. Ignored local env files, Netlify env, Nhost Dashboard, and OS credential stores hold secret classes. GitHub and Netlify authenticated access were verified; team/Nhost membership and least privilege are UNKNOWN and were not changed.
- **Deploy recovery:** authenticated inventory found current ready production deploy `6a9f4c90f36f6e0008023347` / SHA `703a57467fa09f78f32795b211041fcd3a94eb8c` and earlier ready deploys plus a deploy preview. Dry-run identification is reproducible; production was not rolled back.
- **Dependency risk:** `npm audit --omit=dev` found 20 production-tree vulnerabilities: 1 critical, 14 high, 4 moderate, and 1 low. The direct Next.js 13.5.1 finding includes the critical middleware authorization-bypass advisory and has an indicated non-major update path. No dependency was changed in Phase 4; remediation and full regression are required before reopening the pilot.

## Recovery

Direct `pg_dump` failed at authentication without credential guessing. The viable current application backup is a Hasura `run_sql` read-only logical snapshot of all 15 `public` tables plus metadata, stored outside Git. It restored successfully into disposable PostgreSQL 14 with 15 tables, 2 agencies, 2 agents, zero business rows, and reviewed constraints. Latest snapshot: 34,869 bytes, SHA-256 `5DACA289FFB85CF453136E926AA95011B571EB18A6672350323549472CC2E0B1`; 1.6 s acquisition, 10.9 s restore, 0.4 s validation, 12.9 s technical total. No live changes occurred.

This is not a full Nhost backup: Auth/Storage and managed-service recovery are outside its scope. Protection is `MANUAL_BACKUP_ONLY`; RPO is unbounded between runs versus a 24 h target. Full RTO is unproven versus a 4 h target.

## Observability and alert matrix

Structured server-only logs define timestamp, validated/generated request ID, route, method, status, duration, outcome, safe error code, and deployment context where available for all three intake routes and `/api/health`. Bodies and sensitive fields are excluded. Deployed Function Logs captured the JSON schema and preserved an opaque correlation ID. `/api/health` returned healthy with only configuration/Auth/GraphQL pass/fail and a 30 s cache; the deployed smoke rejected malformed requests on all three intake routes without writes.

| Alert | Signal / threshold / window | Severity | Target / status | Runbook |
| --- | --- | --- | --- | --- |
| PUBLIC_INTAKE_5XX | 3 valid 5xx in 10 min | SEV-2 | operator; ALERT GAP until delivery configured | intake |
| AUTH_SERVICE_FAILURE | 3 synthetic/health failures in 10 min | SEV-2 | operator; ALERT GAP | Auth |
| GRAPHQL_SERVICE_FAILURE | 3 health/valid-query failures in 10 min | SEV-2 | operator; ALERT GAP | GraphQL |
| SUSTAINED_RATE_LIMITING | elevated 429 for 15 min | SEV-3 | Netlify Observability/manual; ALERT GAP | intake |
| DATABASE_RESOURCE_PRESSURE | provider CPU/disk signal | SEV-2 | NOT MEASURABLE until Nhost metrics verified | recovery |
| BACKUP_FAILURE_OR_STALE | snapshot fails or age >24 h | SEV-2 | operator/manual; ALERT GAP | recovery |
| DEPLOY_FAILURE | Netlify deploy-failed event | SEV-2 | GitHub commit status configured; delivery NOT VERIFIED | rollback |
| TENANT/SECRET INCIDENT | any signal | SEV-1 | immediate operator escalation | security incident |

## Readiness matrix

| Category | Result | Evidence/gap |
| --- | --- | --- |
| Application correctness | PASS | Phase 3C and 43/43 baseline preserved before Phase 4. |
| Security | BLOCKER | bundle/secret controls pass, but the production dependency audit has 1 critical and 14 high findings. |
| Authorization | PASS | Phase 2B and guards pass; metadata hash/consistency unchanged. |
| Data integrity | PASS | 2/2/2 identity rows; zero business rows; membership/idempotency constraints. |
| Recovery | PARTIAL | application restore verified; full Auth/Storage and managed backup unknown. |
| Observability | PARTIAL | deployed logs/health/correlation verified; Nhost metrics and consolidated history unknown. |
| Alerting | BLOCKER | hooks exist but delivery and application alerts are not verified. |
| Incident response | PASS | scoped runbooks are source-controlled and testable. |
| Deployment/rollback | PASS | current/previous deploy identification and dry-run procedure verified. |
| SLO/error budget | PARTIAL | definitions exist; historical measurement unavailable. |
| Secret management | PASS | server boundaries/ignored files/scans; rotation procedure documented. |
| Quality/testing | PASS | 43/43 baseline, SEO 9/9, accessibility 11/11, Phase 2B, Phase 3A 3/3, Phase 3B 4/4, and final Phase 3C 7/7 passed; fixtures cleaned. |
| Operational access | PARTIAL | authenticated GitHub/Netlify; Nhost roles/least privilege unknown. |

Automatic blockers remain: a critical direct framework advisory, no full-project recovery evidence, and no verified alert delivery for major failures. Limited retention, absent PITR, and optional 21YunBox could be accepted only after actual plan evidence; they are not inferred here.

**PHASE 4 CLASSIFICATION: PARTIAL**

**GENERAL PRODUCTION READINESS: NOT READY**
