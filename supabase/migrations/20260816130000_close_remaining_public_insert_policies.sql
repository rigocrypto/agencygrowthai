/*
# Close anonymous tenant selection on candidates, appointments and consents

`public_insert_leads` was removed in 20260815120000 because an anonymous caller could
name any agency_id. The same policy shape survived on three other tables:

    public_insert_candidates    WITH CHECK (agency_id IS NOT NULL)
    public_insert_appointments  WITH CHECK (agency_id IS NOT NULL)
    public_insert_consents      WITH CHECK (agency_id IS NOT NULL)

`agency_id IS NOT NULL` is not a tenant check. Verified against the live project: an
anonymous POST carrying another agency's real id returned 201 and committed the row.

    POST /rest/v1/candidates   {"agency_id": "<Agency B>", ...}   -> 201, row created
    POST /rest/v1/appointments {"agency_id": "<Agency B>", ...}   -> 201, row created
    POST /rest/v1/consents     {"agency_id": "<Agency B>", ...}   -> 201, row created

This went unnoticed for a run because the probe sent `Prefer: return=representation`.
That makes PostgREST SELECT the row back after inserting; anonymous callers have no
SELECT policy here, so the read-back failed with 42501 and the response looked like the
INSERT had been refused. Without the header the same request succeeds. The test now
probes without it and checks whether the row landed.

Fix, matching `leads`: anonymous callers lose direct INSERT entirely. Authenticated staff
keep a tenant-scoped insert. The public funnels for candidates and appointments must go
through a trusted server route plus a SECURITY DEFINER function that resolves the agency
from a public slug, exactly as app/api/public/leads + public_create_lead() already do.

Until those routes exist, the public career and appointment funnels have no Supabase
write path. That is intentional and currently harmless: the application still runs on
DemoRepository (isDemo remains true), so no user-facing flow depends on this yet. Leaving
the hole open until the routes are built would mean shipping a known cross-tenant write.
*/

-- Anonymous INSERT removed. No policy for `anon` means no path, not a narrower one.
DROP POLICY IF EXISTS "public_insert_candidates" ON candidates;
DROP POLICY IF EXISTS "public_insert_appointments" ON appointments;
DROP POLICY IF EXISTS "public_insert_consents" ON consents;

-- Agency staff may create rows, but only inside their own agency.
DROP POLICY IF EXISTS "insert_own_candidates" ON candidates;
CREATE POLICY "insert_own_candidates"
ON candidates FOR INSERT
TO authenticated
WITH CHECK (agency_id = user_agency_id());

DROP POLICY IF EXISTS "insert_own_appointments" ON appointments;
CREATE POLICY "insert_own_appointments"
ON appointments FOR INSERT
TO authenticated
WITH CHECK (agency_id = user_agency_id());

DROP POLICY IF EXISTS "insert_own_consents" ON consents;
CREATE POLICY "insert_own_consents"
ON consents FOR INSERT
TO authenticated
WITH CHECK (agency_id = user_agency_id());

-- Remove the rows the security probes committed while the hole was open.
DELETE FROM candidates   WHERE email = 'anon.probe.cand@agencygrowthai.test';
DELETE FROM appointments WHERE date = '2026-09-03' AND meeting_type = 'X';
DELETE FROM consents     WHERE consent_text = 'anon probe';
