# Nhost one-agent pilot recovery status

Last verified: 2026-09-07. Scope: `https://agencygrowthai.netlify.app`.

Operational status: `ONE-AGENT PILOT: NO-GO` until the critical direct Next.js dependency finding is patched and the complete security/application regression passes. The recovery evidence below remains valid.

The source default remains `demo`; only the pilot Netlify environment selects `nhost`. The two operator/test Auth users, two agencies, two single-agency memberships, Hasura metadata, and `UNIQUE(public.agents.user_id)` are frozen. No Supabase business backup has been imported.

## Current evidence

- PostgreSQL 14 and Hasura metadata were queried read-only. Metadata was consistent with zero inconsistent objects and SHA-256 `4C6BA10DD46799F66E86889A7B9F9AE5D413D12CCC5E604083C42D0C1D64A034`.
- Direct `pg_dump` is blocked: the local database URI reached PostgreSQL but authentication returned `no authentication method is found`. Credentials were not guessed or changed.
- A read-only Hasura logical snapshot of all 15 `public` tables plus exported Hasura metadata was created outside Git. Its latest drill restored 15 tables, 2 agencies, 2 agents, zero business rows, the membership invariant, and the Phase 3C constraints into disposable PostgreSQL 14.
- Latest measured drill: 1.6 s acquisition, 10.9 s restore, 0.4 s validation, 12.9 s technical total. This excludes incident detection, approval, Auth recovery, cutover, DNS, and full security acceptance.
- Nhost managed backup, retention, PITR, restore UI, and download entitlement are not verified from this project. The in-app browser was unavailable.

Classification: `MANUAL_BACKUP_ONLY` for the application `public` schema and Hasura metadata. Auth/Storage recovery remains a gap. Current RPO is unbounded between manually executed snapshots; pilot target is 24 hours. Full RTO is not yet proven; pilot target is four hours.

Use [nhost-production-recovery-runbook.md](nhost-production-recovery-runbook.md) for an incident. Never restore a backup directly to the live project as a test.
