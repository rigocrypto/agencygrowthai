# Secret rotation runbook

Phase 4 documents rotation only; it rotates nothing.

| Secret class | Owner/storage | Server/client | Dependents |
| --- | --- | --- | --- |
| Netlify auth token | operator OS credential store | privileged local | Netlify CLI/API |
| Hasura/Nhost admin secret | Nhost + Netlify scoped env; ignored local env | server-only | trusted routes, ops suites |
| PostgreSQL credential | Nhost Dashboard; ignored local env | server-only | backup/admin tooling |
| Test-user passwords | ignored `.env.test.local` | test-only | Auth/security suites |
| GitHub token | GitHub CLI OS credential store | privileged local | repository/deploy workflow |
| Public Nhost identifiers | Netlify env/source-safe public config | client-safe | Nhost SDK/health routing |

For rotation: declare owner/window; inventory all dependents; create the new provider-side credential; update server-only Netlify scopes and ignored operator storage; trigger a fresh deploy when needed; validate `/api/health`, Auth/JWT binding, trusted intake, tenant security, logs, and secret scans; then revoke the old credential. **Rollback:** restore the still-valid prior credential only within the approved overlap window. Never expose values in commands, commits, tickets, logs, screenshots, browser variables, or chat.

Database rotation also requires a read-only `SELECT 1` before backup tooling. Auth test passwords must use the normal Nhost reset flow—never SQL. An exposed secret is handled by the security incident runbook, not a routine rotation.
