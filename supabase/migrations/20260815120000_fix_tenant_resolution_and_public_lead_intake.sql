/*
# Fix tenant resolution and close anonymous cross-tenant lead writes

NOT YET APPLIED to any project. Review before running.

## Problem 1 — user_agency_id() reads a claim that does not exist

The original helper resolved the tenant from a JWT claim:

    auth.jwt() -> 'app_user_data' ->> 'agency_id'

Supabase does not populate `app_user_data`. The standard claim is `app_metadata`, and
nothing in this project ever writes an agency_id into it. The function therefore returns
NULL for every user, every `agency_id = user_agency_id()` predicate evaluates to NULL,
and every authenticated SELECT returns zero rows. That fails closed — safe, but the
dashboard is empty.

The schema already carries the correct relationship: `agents.user_id` references
`auth.users(id)`. That row IS the membership record. Resolving the tenant through it
means the mapping lives in a table the user cannot edit, not in a token claim.

    auth.uid() -> agents.user_id -> agents.agency_id

## Problem 2 — anonymous callers choose the destination tenant

    CREATE POLICY "public_insert_leads" ON leads FOR INSERT
    TO anon, authenticated WITH CHECK (consent = true);

`agency_id` is unconstrained. Any anonymous caller could insert a lead into any agency by
posting a chosen agency_id straight to PostgREST. Removing `agency_id` from the
application's input types does not help — that is a compile-time boundary and the
attacker is not using the application.

Fix: anonymous callers lose direct INSERT on `leads` entirely. The only anonymous write
path becomes a SECURITY DEFINER function that resolves the tenant from a public slug
inside the database. The client cannot express `agency_id` at all, so there is nothing
to forge, and RLS remains the boundary because anon simply has no INSERT policy.
*/

-- ---------------------------------------------------------------------------
-- 1. Tenant resolution via the agents membership record
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION user_agency_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT agency_id
  FROM agents
  WHERE user_id = auth.uid()
    AND status = 'active'
  LIMIT 1
$$;

COMMENT ON FUNCTION user_agency_id() IS
  'Resolves the caller''s agency from the agents membership row. Never reads client-supplied input.';

-- An inactive agent loses data access. Index the lookup the policies now depend on.
CREATE INDEX IF NOT EXISTS agents_user_id_idx ON agents (user_id) WHERE user_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Public funnel identifier
-- ---------------------------------------------------------------------------

-- A non-sensitive public identifier for an agency's funnel. NULL = no public funnel.
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS public_slug text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'agencies_public_slug_key'
  ) THEN
    ALTER TABLE agencies ADD CONSTRAINT agencies_public_slug_key UNIQUE (public_slug);
  END IF;
END $$;

COMMENT ON COLUMN agencies.public_slug IS
  'Public funnel identifier. Safe to expose in URLs. Resolved server-side to an agency_id.';

-- ---------------------------------------------------------------------------
-- 3. Leads: remove the anonymous insert hole, add a scoped authenticated insert
-- ---------------------------------------------------------------------------

-- Anonymous callers can no longer INSERT into leads under any circumstances.
DROP POLICY IF EXISTS "public_insert_leads" ON leads;

-- Agency staff creating a lead by hand may only create it inside their own agency.
DROP POLICY IF EXISTS "insert_own_leads" ON leads;
CREATE POLICY "insert_own_leads"
ON leads FOR INSERT
TO authenticated
WITH CHECK (agency_id = user_agency_id());

-- ---------------------------------------------------------------------------
-- 4. The only anonymous write path
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public_create_lead(
  p_agency_slug       text,
  p_first_name        text,
  p_last_name         text,
  p_email             text,
  p_phone             text,
  p_consent           boolean,
  p_score             integer,
  p_score_tier        text,
  p_source            text    DEFAULT 'direct',
  p_interest          text    DEFAULT NULL,
  p_consent_method    text    DEFAULT NULL,
  p_preferred_contact text    DEFAULT NULL,
  p_checkup_responses jsonb   DEFAULT NULL,
  p_ai_summary        text    DEFAULT NULL
)
RETURNS leads
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency_id uuid;
  v_lead      leads;
BEGIN
  IF p_consent IS NOT TRUE THEN
    RAISE EXCEPTION 'consent_required' USING ERRCODE = '23514';
  END IF;

  IF p_first_name IS NULL OR btrim(p_first_name) = ''
     OR p_last_name IS NULL OR btrim(p_last_name) = ''
     OR p_email IS NULL OR btrim(p_email) = '' THEN
    RAISE EXCEPTION 'contact_details_required' USING ERRCODE = '23514';
  END IF;

  -- The score arrives already computed by the trusted server route (see below), but this
  -- function still refuses values outside the domain rather than storing them blindly.
  IF p_score IS NULL OR p_score < 0 OR p_score > 100 THEN
    RAISE EXCEPTION 'score_out_of_range' USING ERRCODE = '23514';
  END IF;

  IF p_score_tier IS NULL OR p_score_tier NOT IN ('low', 'moderate', 'high', 'priority') THEN
    RAISE EXCEPTION 'invalid_score_tier' USING ERRCODE = '23514';
  END IF;

  -- The tenant is derived here. The caller never supplies an agency_id.
  SELECT id INTO v_agency_id
  FROM agencies
  WHERE public_slug = p_agency_slug;

  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'unknown_agency_slug' USING ERRCODE = '22023';
  END IF;

  INSERT INTO leads (
    agency_id, first_name, last_name, email, phone, source, status,
    score, score_tier, interest, consent, consent_method, preferred_contact,
    checkup_responses, ai_summary
  ) VALUES (
    v_agency_id, p_first_name, p_last_name, p_email, p_phone, p_source, 'new',
    p_score, p_score_tier,
    p_interest, true, p_consent_method, p_preferred_contact,
    p_checkup_responses, p_ai_summary
  )
  RETURNING * INTO v_lead;

  RETURN v_lead;
END;
$$;

-- The browser must NOT be able to call this: it takes a score, and a caller who can pass
-- a score controls it. EXECUTE is granted only to service_role, which is used exclusively
-- by the server route that computes the score with the application's own scoring rules.
-- Anonymous callers therefore have no write path into leads at all: no INSERT policy and
-- no EXECUTE on this function.
REVOKE ALL ON FUNCTION public_create_lead(
  text, text, text, text, text, boolean, integer, text, text, text, text, text, jsonb, text
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public_create_lead(
  text, text, text, text, text, boolean, integer, text, text, text, text, text, jsonb, text
) FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION public_create_lead(
  text, text, text, text, text, boolean, integer, text, text, text, text, text, jsonb, text
) TO service_role;

COMMENT ON FUNCTION public_create_lead IS
  'Server-only lead intake. Resolves the tenant from a public slug; agency_id is never caller-supplied. EXECUTE restricted to service_role.';
