# Tenant isolation fixtures

The isolation suite (`npm run test:tenant`) tests PostgreSQL's answer, not the
application's. It needs a real Supabase project with two agencies, two authenticated
users and four leads. Nothing in the repository can create that on its own: seeding
requires privileges the anon key does not have, by design.

## One-time setup

1. **Apply the migration** — in the SQL editor, run
   `supabase/migrations/20260815120000_fix_tenant_resolution_and_public_lead_intake.sql`.
   Without it `user_agency_id()` resolves to NULL for everyone and `public_create_lead`
   does not exist.

2. **Create two users** under Authentication → Users:

   | Email | Agency |
   |---|---|
   | `test-agency-a@isolation.invalid` | A |
   | `test-agency-b@isolation.invalid` | B |

   Note both user UUIDs.

3. **Seed** — paste those UUIDs into the two variables at the top of
   `tenant_isolation_seed.sql` and run it.

4. **Credentials** — create `.env.test.local` (git-ignored):

   ```
   TENANT_TEST_A_EMAIL=test-agency-a@isolation.invalid
   TENANT_TEST_A_PASSWORD=...
   TENANT_TEST_B_EMAIL=test-agency-b@isolation.invalid
   TENANT_TEST_B_PASSWORD=...
   ```

5. **Server key** — the lead-intake route needs the service-role key. Put it in `.env`
   **without** a `NEXT_PUBLIC_` prefix, so it is never bundled into browser code:

   ```
   SUPABASE_SERVICE_ROLE_KEY=...
   NEXT_PUBLIC_AGENCY_SLUG=test-agency-a
   ```

6. **Run** — `npm run test:tenant` (builds are served from `next start` on port 3100;
   run `npm run build` first if the app has changed)

## Use a development project

The seed writes rows and the suite attempts cross-tenant reads, updates and deletes.
Point it at a development project, never at production data.

## Reading the results

A passing run is the only evidence that multi-tenancy works. In particular, TEST 7 and
TEST 8 guard against the two ways this suite could look green while proving nothing:

- **TEST 7** fails if `public_create_lead` is missing, or if the anonymous insert is
  rejected by a foreign-key violation rather than by RLS. An unseeded database rejects
  everything for the wrong reasons; the assertions distinguish the two.
- **TEST 8** never calls the repository. If it passes only because
  `lib/repo/supabase.ts` adds a `WHERE agency_id = ...`, the product is not isolated —
  an attacker simply would not use that file.
