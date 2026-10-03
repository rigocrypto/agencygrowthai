# AgencyGrowthAI provisional SLOs

Effective 2026-09-07 for the controlled pilot. Historical compliance is unknown because consolidated monitoring and alert delivery are not yet verified. Expected 400/404/409/413/429 responses are excluded from platform-availability failure ratios; security-boundary failures override every error budget.

| Journey/service | SLI | Provisional SLO / 30 days | Error budget | Source | Alert/runbook |
| --- | --- | --- | --- | --- | --- |
| J1 public site | successful HTTPS synthetic ratio | 99.5% | 216 min | production smoke + Netlify Observability | 2 failures/5 min, SEV-2; incident |
| J2 agent Auth | valid synthetic login/session ratio | 99.0% | 432 min | Auth synthetic + Nhost logs when available | 3 failures/10 min, SEV-2; Auth |
| J3 dashboard/GraphQL read | valid tenant-read success ratio | 99.0% | 432 min | Phase suite + function/Nhost logs | 3 valid failures/10 min, SEV-2; GraphQL |
| J4 public lead intake | valid-request persistent success ratio | 99.0% | 432 min | structured function logs + create-test-clean synthetic | 3 5xx/10 min, SEV-2; intake |
| J5 lead update | valid own-tenant update success ratio | 99.0% | 432 min | Phase 3B/3C synthetic + GraphQL logs | 3 failures/10 min, SEV-2; GraphQL |
| J6 appointment workflow | valid create/update success ratio | 99.0% | 432 min | Phase 3B/3C synthetic + function logs | 3 failures/10 min, SEV-2; intake |
| API latency | p95 duration for valid successful operations | p95 < 2 s | not availability budget | structured `duration_ms` / Netlify | p95 > 2 s for 15 min, SEV-3 |
| Backup freshness | age of verified application snapshot | < 24 h target | no grace for missed daily check | checksum + recovery inventory | >24 h, SEV-2; recovery |

Recovery targets: application-data RPO 24 h and full pilot RTO 4 h. Current RPO is unbounded between manual snapshots; only the 12.9 s technical snapshot/restore/validation portion has been measured. Auth/Storage recovery and full detection/approval/cutover/security validation are not timed.

Budget consumption uses total eligible minutes or valid requests in the rolling window. At 50% burn, freeze non-operational changes and investigate; at 100%, stop releases until reliability work restores margin. SEV-1/security events always stop releases regardless of remaining budget.
