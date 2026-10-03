# Netlify deployment rollback runbook

Use rollback for an application/deploy regression when the database and current metadata remain compatible. Prefer forward remediation for incompatible schema transitions.

1. Record the bad deploy ID, commit SHA, timestamp, context, logs, and affected journeys. Current Phase 4 inventory identified production deploy `6a9f4c90f36f6e0008023347` at commit `703a57467fa09f78f32795b211041fcd3a94eb8c`, plus earlier ready production deploys.
2. In the existing `agencygrowthai` site, identify the last known-good ready deploy and compare its required environment-variable names and migration/metadata compatibility. Never create a replacement site.
3. Dry-run: open deploy history, select the intended deploy, verify ID/SHA/context/time, and confirm the UI offers publishing/rollback. Phase 4 verified deploy history and a ready deploy preview through the authenticated API; it did not republish production.
4. With incident-owner approval, publish the selected deploy. Environment changes may require a new build; do not assume an old artifact contains current public configuration.
5. Run `/`, `/login`, `/financial-checkup`, `/career`, anonymous `/dashboard` protection, `/api/health`, real Auth, tenant-isolation smoke, safe malformed intake, and rate-limit verification. Confirm function logs and metadata consistency.
6. Record the resulting production deploy ID/SHA and communicate closure. If data/security compatibility is uncertain, do not rollback; contain traffic and use the incident/recovery runbooks.

Procedure status: reproducible dry-run verified; production rollback intentionally not executed.
