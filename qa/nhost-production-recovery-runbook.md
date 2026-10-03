# Nhost production recovery runbook

## Declare and contain

1. Declare an incident, assign an owner, record UTC time, symptoms, deployed SHA/ID, metadata hash, safe row counts, and correlation IDs. Suspected tenant crossing or data loss is SEV-1.
2. Stop or restrict public writes using the least disruptive platform control. Do not weaken Hasura permissions, edit Auth users, or operate on rows without provenance.
3. Inventory available Nhost restore points in the project Dashboard. Record actual plan, timestamp, retention, scope, and download/restore options. Do not infer entitlement from documentation.

> **RESTORING A BACKUP TO THE LIVE PROJECT IS DESTRUCTIVE.** It may replace current data and must never be used for a drill.

## Select a recovery path

- Prefer a verified managed restore point when it covers the incident and its RPO is acceptable.
- The repository fallback is `npm run test:ops:recovery`: it obtains a read-only Hasura snapshot of `public` plus metadata and restores into disposable local PostgreSQL 14. The artifact is written outside Git. It does not back up managed Auth/Storage.
- Direct `pg_dump` may be used only after `SELECT 1` succeeds with the exact Dashboard URI. Never guess credentials. Match the PostgreSQL major version and record timestamp, size, checksum, catalog, and scope.
- An alternate Nhost project may be used only if already available at no added cost and explicitly approved. Apply reviewed migrations/metadata, restore data, validate, then plan DNS/environment cutover.

## Validate before any cutover

Require: database starts; expected schemas and 15 application tables; constraints and `UNIQUE(agents.user_id)`; expected row counts; Auth structural integrity for full backups; consistent Hasura metadata; no inconsistent objects; Phase 2B, 3A, 3B, and 3C suites; two-tenant known-ID denial; idempotency and intake guards; secret scan; HTTPS and protected dashboard.

If any validation fails, abandon that restore target and preserve it for analysis. A same-project restore requires explicit operator approval, a maintenance window, confirmed backup selection, accepted data-loss window, and a rollback decision. Communicate start, scope, RPO impact, validation status, and closure. Preserve logs, checksums, commands, deploy IDs, and the post-incident review.
