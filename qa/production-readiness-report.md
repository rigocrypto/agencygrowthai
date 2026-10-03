# Production Readiness Report

**Assessment date:** 2026-09-03
**Assessment scope:** current working tree and latest local execution evidence.

## 1. Current Classification

Status: PRE-PRODUCTION HARDENING

## 2. Database Security

Status: VERIFIED

- Supabase project: `xthjxmbekjsrjebiqlsv`
- 10/10 migrations applied remotely.
- 15/15 tenant-owned tables protected by RLS.
- Tenant resolution is `auth.uid() -> agents.user_id -> agents.agency_id`.
- Cross-tenant SELECT, INSERT, UPDATE, DELETE, and tenant-transfer attempts are blocked.
- Anonymous tenant injection, forged audit-log writes, and public RPC abuse were discovered and closed.
- RLS is the database boundary; repository filtering is not treated as authorization.
- 80 tenant/security tests passed in the supplied verification evidence.

No database-security regression was observed in this local assessment. The remote test evidence must be rerun after application changes before pilot approval.

## 3. Application -> Supabase Integration

Status: NOT YET VERIFIED

- The real AuthProvider path is pending application-level verification.
- `SupabaseRepository` contains all 22 `IRepository` methods, but implementation is not runtime evidence.
- Repository selection is environment-selected: `NEXT_PUBLIC_DATA_MODE=supabase` selects `supabaseRepository`; any other value, including an unset value, selects `demoRepository`.
- `isDemoMode` is derived from that mode and is no longer forced true.
- Real authenticated persistence has not been proven through the UI.

## 4. One-Agent Pilot

Status: NOT YET READY

The minimum real-agent journey, public financial-checkup persistence, appointment creation, candidate intake, and deployed staging smoke test are not yet verified against the real Supabase project.

## 5. Production Readiness

Status: NO

This sprint targets a controlled one-agent pilot, not full production readiness. Production launch remains explicitly out of scope.

## 6. Latest Local Evidence

| Gate | Status | Evidence |
| --- | --- | --- |
| Lint | VERIFIED | `npm run lint` exits 0 with no warnings or errors |
| Typecheck | VERIFIED | `npm run typecheck` exits 0 after the pilot integration slice |
| Production build | VERIFIED WITH WARNING | `npm run build` exits 0; Supabase Realtime emits a dynamic-dependency warning and Browserslist data is outdated |
| Static verification | NOT VERIFIED | 7 checks verified, 1 runtime check pending in [verification-matrix.md](verification-matrix.md) |
| Accessibility | VERIFIED | Final production baseline included all 11 accessibility specs with 0 failures; the last repaired home-route contrast issue is closed |
| Auth route guard | VERIFIED LOCALLY | Focused `auth-exposure.spec.ts`: 11/11 passed |
| Full E2E baseline | VERIFIED | Repaired `npm run test:e2e:baseline`: 43 total, 43 passed, 0 failed, 0 skipped, 0 not run; baseline 0 and baseline matches |
| Tenant isolation | CURRENT RERUN BLOCKED; PREVIOUS BASELINE VERIFIED | The previous remote evidence reports 80/80 passing; the current rerun is blocked at DNS for `xthjxmbekjsrjebiqlsv.supabase.co`; no security assertion was weakened |
| Deployment | NOT VERIFIED | Netlify configuration exists; no staging URL or deployed smoke evidence |
| SEO | VERIFIED | `tests/seo.spec.ts`: 9/9 passed against a fresh production build |
| Performance | VERIFIED LOCALLY, LIMITED SCOPE | Existing harness evidence: 3/3 passed for `/`, `/financial-checkup`, and `/career`; localhost TTFB is not staging evidence |

## 7. Files Changed In This Pass

- [production-readiness-report.md](production-readiness-report.md)
- [globals.css](../app/globals.css)
- [career/page.tsx](../app/career/page.tsx)
- [financial-checkup/page.tsx](../app/financial-checkup/page.tsx)
- [login/page.tsx](../app/login/page.tsx)
- [not-found.tsx](../app/not-found.tsx)
- [page.tsx](../app/page.tsx)
- [dashboard/leads/[id]/page.tsx](../app/dashboard/leads/[id]/page.tsx)
- [dashboard-shell.tsx](../components/dashboard/dashboard-shell.tsx)
- [repo/index.ts](../lib/repo/index.ts)
- [repo/supabase.ts](../lib/repo/supabase.ts)
- [api/public/leads/route.ts](../app/api/public/leads/route.ts)
- [api/public/candidates/route.ts](../app/api/public/candidates/route.ts)
- [api/public/appointments/route.ts](../app/api/public/appointments/route.ts)
- [career/layout.tsx](../app/career/layout.tsx), [financial-checkup/layout.tsx](../app/financial-checkup/layout.tsx), [privacy/layout.tsx](../app/privacy/layout.tsx), [terms/layout.tsx](../app/terms/layout.tsx), [disclaimers/layout.tsx](../app/disclaimers/layout.tsx), and [layout.tsx](../app/layout.tsx)

## 8. Supabase Runtime Activation Assessment

| Required item | Status | Evidence |
| --- | --- | --- |
| PROJECT EXISTENCE | VERIFIED | Authenticated Supabase CLI lists `xthjxmbekjsrjebiqlsv` as `AgencyGrowthAI`; linked ref matches exactly |
| PROJECT STATUS | FAILED | Supabase CLI reports project status `INACTIVE`; runtime activation is stopped per the gate |
| CONNECTIVITY CLASSIFICATION | FAILED | `PROJECT_NOT_AVAILABLE`: the exact project exists but is inactive; DNS/HTTPS failures are downstream of that state |
| DNS | FAILED | OS resolver, PowerShell, Node, and `nslookup` report `ENOTFOUND`/non-existent domain for `xthjxmbekjsrjebiqlsv.supabase.co` |
| HTTPS | FAILED | HTTPS cannot proceed because the hostname does not resolve |
| ENV FILE | VERIFIED | `.env` contains URL, anon key, service-role key, and agency slug; URL host matches the expected project and no whitespace/quote contamination was found |
| NEXT.JS ENV LOADING | VERIFIED | `@next/env` loads URL, anon key, service-role key, and agency slug from `.env`; `NEXT_PUBLIC_DATA_MODE` is absent and defaults to demo |
| ACTIVE REPOSITORY | VERIFIED | Current process has no `NEXT_PUBLIC_DATA_MODE`; source default resolves `ACTIVE_REPOSITORY=demo` |
| AUTH USER A | NOT RUN | Project inactive and DNS unavailable |
| AUTH USER B | NOT RUN | Project inactive and DNS unavailable |
| TENANT RESOLUTION | NOT RUN | Requires authenticated runtime access to the inactive project |
| REPOSITORY READS | NOT RUN | Supabase mode was not activated |
| REPOSITORY WRITES | NOT RUN | Supabase mode was not activated; no writes attempted |
| FINANCIAL CHECKUP | NOT RUN | Real persistence cannot be tested against an inactive project |
| CAREER | NOT RUN | Real persistence cannot be tested against an inactive project |
| APPOINTMENTS | NOT RUN | Real persistence cannot be tested against an inactive project |
| REAL PERSISTENCE | NOT RUN | No authoritative database-row evidence collected |
| TENANT SECURITY 80/80 | NOT VERIFIED | Previous `80/80` baseline remains verified; current post-integration rerun is blocked before Auth by project inactivity/DNS |

## 9. Active Data Mode

Status: VERIFIED + configuration evidence

Source selection is environment-driven. With no `NEXT_PUBLIC_DATA_MODE` in this workspace, the code resolves `ACTIVE_REPOSITORY=demo`; staging must explicitly set `NEXT_PUBLIC_DATA_MODE=supabase` and fail visibly if Supabase configuration is incomplete. No credential values are recorded here.

## 10. Repository Status

**IMPLEMENTED (22/22 by source inspection):** `getAgency`, `getAgents`, `getLeads`, `getLead`, `getLeadEvents`, `getAppointments`, `getAppointmentsByLead`, `getCandidates`, `getCandidate`, `getCandidateEvents`, `getCampaigns`, `getContentAssets`, `getAuditLogs`, `createLead`, `updateLead`, `createAppointment`, `updateAppointment`, `createCandidate`, `updateCandidate`, `updateContentStatus`, `createContentAsset`, `getDashboardMetrics`.

**VERIFIED:** the repository has no tenant-id method parameter according to the 3/3 static boundary tests; authenticated queries omit agency filters and depend on RLS.

**NOT VERIFIED:** runtime repository calls against real Auth/RLS, error behavior against the remote database, and public lead/candidate/appointment persistence against staging.

## 11. Public Funnels

- **Financial Checkup:** client calls the trusted lead route; server-side scoring and slug-based persistence are implemented, but real database persistence is not verified.
- **Career:** trusted server-side candidate route is implemented; real persistence is not verified.
- **Appointment creation:** trusted server-side appointment route validates the lead against the configured agency; real persistence is not verified.

## 12. Required Pilot Stages

### Stage 1: Code quality and accessibility

Lint, the semantic fixes, accessibility, and the complete production Playwright baseline are verified. The financial-checkup runtime assertion still does not prove a real database row.

**Exit evidence:** lint, typecheck, build, pilot-critical axe checks, and functional E2E checks pass with no suppressed rules.

### Stage 2: Real Auth and repository activation

Activate real Supabase Auth and the existing repository methods needed for the pilot: `getAgency`, `getLeads`, `getLead`, and `createLead` first, followed by required appointments, candidates, events, metrics, and agent lookups. Errors must throw explicitly; no silent demo fallback is permitted.

**Exit evidence:** two real test users authenticate, sessions restore after refresh, logout removes access, and each user sees only the agency resolved from database membership.

### Stage 3: Real pilot workflows

Verify the financial-checkup lead funnel, lead status/notes persistence, appointment creation/status updates, and trusted server-side candidate intake. Keep direct anonymous table writes closed and derive actor and tenant context server-side.

**Exit evidence:** both minimum pilot journeys create and retrieve real rows from Supabase, with no browser-controlled tenant, score, owner, or actor fields.

### Stage 4: Staging deployment and controls

Deploy the exact production build to a private/staging Netlify environment, configure secrets only in the environment, run the deployed smoke suite, and document logging, health verification, backups, rollback, pilot user, support path, and test-data cleanup.

**Exit evidence:** staging URL smoke tests pass for auth, leads, appointments, candidates, logout, refresh, and tenant probes; no secret is exposed or logged.

## 13. Known Limitations

Billing, ad integrations, WhatsApp/SMS, calendar-provider sync, full AI provider integration, advanced white-labeling, enterprise monitoring, and production launch remain outside this pilot.

## 14. Go / No-Go

Status: ONE-AGENT PILOT: NO-GO

Current blockers are unverified real Auth/repository persistence, current Supabase DNS failure, the blocked post-integration 80-test security rerun, incomplete runtime persistence evidence, limited localhost-only performance evidence, and missing deployed staging smoke evidence.
