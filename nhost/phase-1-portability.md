# AgencyGrowthAI Nhost Phase 1

## Scope

This phase ports only the final `public` application schema. It contains no data,
Supabase roles, grants, policies, internal schemas, or Auth records.

## Canonical schema inventory

| Table | Columns | Primary/unique keys | Foreign keys | Checks | Secondary indexes |
| --- | ---: | --- | --- | ---: | ---: |
| agencies | 16 | `id`; `public_slug` unique | none | 0 | 0 |
| settings | 6 | `id`; `(agency_id,key)` unique | agency | 0 | 1 |
| campaigns | 12 | `id` | agency | 2 | 1 |
| campaign_events | 7 | `id` | campaign, agency | 0 | 2 |
| agents | 12 | `id` | agency, Nhost Auth user | 3 | 2 |
| leads | 24 | `id` | agency, campaign, assigned agent | 3 | 5 |
| lead_events | 7 | `id` | lead, agency | 0 | 2 |
| appointments | 11 | `id` | agency, lead, agent | 1 | 5 |
| candidates | 18 | `id` | agency, assigned agent | 2 | 4 |
| candidate_events | 6 | `id` | candidate, agency | 0 | 2 |
| content_assets | 13 | `id` | agency, creator, reviewer | 2 | 2 |
| content_reviews | 7 | `id` | content asset, agency, reviewer | 1 | 1 |
| ai_interactions | 7 | `id` | agency, Nhost Auth user | 0 | 1 |
| consents | 7 | `id` | agency, lead | 0 | 2 |
| audit_logs | 8 | `id` | agency, Nhost Auth user | 0 | 2 |

All identifiers, data types, nullability, defaults, FK delete behavior, checks, and
index definitions are explicit in the accompanying `up.sql`. The final source adds
`agencies.public_slug` and the partial `agents(user_id)` index; both are included.
The source defines no application enum types or update triggers.

## Portability matrix

| Source object | Classification | Nhost treatment |
| --- | --- | --- |
| 15 `public` tables | PORT_AS_IS | Preserve final relational shape |
| UUID PKs and `gen_random_uuid()` | PORT_AS_IS | Function already exists in target |
| text, numeric, boolean, date, timestamptz, jsonb | PORT_AS_IS | Native PostgreSQL types |
| PK, unique, check, and application FK constraints | PORT_AS_IS | Preserve definitions |
| Secondary and partial indexes | PORT_AS_IS | Preserve definitions |
| `agents.user_id`, `ai_interactions.user_id`, `audit_logs.user_id` | PORT_WITH_CHANGE | Point to Nhost-managed `auth.users(id)`; do not modify Auth |
| `auth.uid()` tenant resolution | REWRITE | Replace with Hasura session/relationship authorization in Phase 2 |
| `user_agency_id()` and `is_agency_admin()` | REWRITE | Not created in Phase 1 |
| `public_create_lead()` | REWRITE | Future trusted Nhost server route; not created in Phase 1 |
| Supabase RLS policies | REWRITE | Not copied; future defense-in-depth requires runtime proof |
| Supabase anon/authenticated/service_role grants | EXCLUDE | Supabase-specific roles do not exist in Nhost |
| Supabase `auth`, `storage`, `realtime`, `supabase_migrations` | EXCLUDE | Nhost-owned internals remain untouched |
| Cleanup `DELETE` statements and all backup `COPY` data | EXCLUDE | Phase 1 is schema-only |

## Auth FK strategy

`DIRECT_FK` is selected. Target inspection proves `auth.users.id` is a non-null UUID
primary key and the migration role has `REFERENCES` privilege. Nhost documentation also
uses public-table FKs to `auth.users(id)`. Delete behavior remains `ON DELETE SET NULL`.

## Authorization and RLS feasibility

Primary authorization boundary: **Hasura permissions**.

PostgreSQL RLS feasibility is `PARTIAL`: `nhost_hasura` is neither superuser nor
`BYPASSRLS`, and Hasura supplies a `hasura.user` session GUC. However, objects created
through the source are owned by that role, PostgreSQL owners bypass ordinary RLS unless
forced, and authenticated runtime behavior has not yet been proven. Phase 1 therefore
does not create misleading RLS policies. Phase 2 must test any `FORCE ROW LEVEL SECURITY`
design with user, admin, and trusted-server requests before treating it as a boundary.

## Deny-by-default state in Phase 1

All 15 tables may be tracked for GraphQL, but no `public`, `user`, `agent`, or
`agency_admin` CRUD permissions are granted. Tracking is not authorization. Anonymous
and authenticated callers therefore receive no application schema surface.

## Phase 2 permission blueprint

`tenant_scope` below means an active membership reached through a database relationship:
`row.agency.agents(user_id = X-Hasura-User-Id, status = active)`. It never accepts an
unverified browser `agency_id` as ownership evidence.

| Table(s) | Role | Select | Insert | Update | Delete | Column/check notes |
| --- | --- | --- | --- | --- | --- | --- |
| agencies | agent | tenant_scope | no | no | no | public branding plus own tenant only |
| agencies | agency_admin | tenant_scope | no | tenant_scope | immutable `id`; post-check tenant_scope |
| agents | agent | tenant_scope | no | own row only | no | never update `agency_id`, `user_id`, or `role` |
| agents | agency_admin | tenant_scope | custom-claim preset required | tenant_scope | no | ownership must be server/claim derived |
| settings, campaigns | agent | tenant_scope | no | no | no | read-only operational configuration |
| settings, campaigns | agency_admin | tenant_scope | custom-claim preset required | tenant_scope | tenant_scope | exclude `agency_id` from mutable columns |
| leads, appointments, candidates | agent | tenant_scope | no | tenant_scope | no | public/staff creation stays on trusted server until an agency preset exists |
| leads, appointments, candidates | agency_admin | tenant_scope | custom-claim preset required | tenant_scope | tenant_scope | insert/update checks both require tenant_scope |
| lead_events, candidate_events, campaign_events | agent | tenant_scope | no | no | no | append only through trusted server |
| lead_events, candidate_events, campaign_events | agency_admin | tenant_scope | custom-claim preset required | no | tenant_scope | no direct tenant selector |
| content_assets, content_reviews | agent | tenant_scope | no | tenant_scope | no | workflow columns only; exclude ownership columns |
| content_assets, content_reviews | agency_admin | tenant_scope | custom-claim preset required | tenant_scope | tenant_scope | insert/update checks require tenant_scope |
| consents | agent | tenant_scope | no | no | no | public intake remains server-only |
| ai_interactions, audit_logs | agent | no | no | no | no | sensitive compliance data |
| ai_interactions, audit_logs | agency_admin | tenant_scope | no | no | no | writes only through trusted server |

For every tenant-owned insert, Phase 2 must either preset `agency_id` from a verified
`x-hasura-agency-id` claim or use a trusted server route. Merely checking
`agency_id IS NOT NULL` is prohibited. The `public` role gets no direct CRUD permission
on any application table.
