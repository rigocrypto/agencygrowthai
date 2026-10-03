/*
Tenant isolation fixtures — two fictional agencies, two users, four leads.

RUN THIS IN THE SUPABASE SQL EDITOR, on a development project only.
It requires privileges that the anon key does not have, which is why it is a script for
a human to run rather than something the test suite creates for itself.

BEFORE RUNNING
  1. Apply supabase/migrations/20260815120000_fix_tenant_resolution_and_public_lead_intake.sql
  2. Create two users under Authentication -> Users:
       test-agency-a@isolation.invalid
       test-agency-b@isolation.invalid
     Give each a password and note the two user UUIDs.
  3. Paste those UUIDs into the two variables below.
  4. Put the same credentials in .env.test.local:
       TENANT_TEST_A_EMAIL=test-agency-a@isolation.invalid
       TENANT_TEST_A_PASSWORD=...
       TENANT_TEST_B_EMAIL=test-agency-b@isolation.invalid
       TENANT_TEST_B_PASSWORD=...

All rows are fictional and prefixed with TEST so they are obvious in the dashboard.
Identifiers must stay in sync with tests-tenant/fixtures.ts.
*/

DO $$
DECLARE
  -- >>> REPLACE THESE TWO WITH THE REAL auth.users UUIDs <<<
  v_user_a uuid := '00000000-0000-0000-0000-000000000000';
  v_user_b uuid := '00000000-0000-0000-0000-000000000000';

  v_agency_a uuid := 'aaaaaaaa-0000-4000-8000-0000000000a1';
  v_agency_b uuid := 'bbbbbbbb-0000-4000-8000-0000000000b1';
BEGIN
  IF v_user_a = '00000000-0000-0000-0000-000000000000'::uuid
     OR v_user_b = '00000000-0000-0000-0000-000000000000'::uuid THEN
    RAISE EXCEPTION 'Replace v_user_a and v_user_b with the real auth.users UUIDs first.';
  END IF;

  -- Agencies -----------------------------------------------------------------
  INSERT INTO agencies (id, name, contact_email, public_slug)
  VALUES
    (v_agency_a, 'TEST Agency A (isolation fixture)', 'a@isolation.invalid', 'test-agency-a'),
    (v_agency_b, 'TEST Agency B (isolation fixture)', 'b@isolation.invalid', 'test-agency-b')
  ON CONFLICT (id) DO UPDATE
    SET public_slug = EXCLUDED.public_slug,
        name        = EXCLUDED.name;

  -- Membership records — this is what user_agency_id() resolves through -------
  INSERT INTO agents (agency_id, user_id, first_name, last_name, email, role, status)
  VALUES
    (v_agency_a, v_user_a, 'TEST', 'Owner A', 'test-agency-a@isolation.invalid', 'agency_owner', 'active'),
    (v_agency_b, v_user_b, 'TEST', 'Owner B', 'test-agency-b@isolation.invalid', 'agency_owner', 'active')
  ON CONFLICT DO NOTHING;

  -- Leads --------------------------------------------------------------------
  INSERT INTO leads (id, agency_id, first_name, last_name, email, phone, source, status, consent)
  VALUES
    ('aaaaaaaa-0000-4000-8000-00000000a101', v_agency_a, 'TEST', 'Lead A1', 'test.a1@isolation.invalid', '(555) 100-0001', 'direct', 'new', true),
    ('aaaaaaaa-0000-4000-8000-00000000a102', v_agency_a, 'TEST', 'Lead A2', 'test.a2@isolation.invalid', '(555) 100-0002', 'direct', 'new', true),
    ('bbbbbbbb-0000-4000-8000-00000000b101', v_agency_b, 'TEST', 'Lead B1', 'test.b1@isolation.invalid', '(555) 200-0001', 'direct', 'new', true),
    ('bbbbbbbb-0000-4000-8000-00000000b102', v_agency_b, 'TEST', 'Lead B2', 'test.b2@isolation.invalid', '(555) 200-0002', 'direct', 'new', true)
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Tenant isolation fixtures ready.';
END $$;

-- Verification: each user must resolve to exactly one agency.
-- SELECT a.email, a.agency_id FROM agents a WHERE a.email LIKE 'test-agency-%';
