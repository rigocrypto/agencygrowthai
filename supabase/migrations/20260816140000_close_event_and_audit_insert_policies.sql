/*
# Close cross-tenant writes on lead_events, candidate_events and audit_logs

Third and final set of policies carrying the broken ownership check:

    insert_own_lead_events       TO authenticated, anon  WITH CHECK (agency_id IS NOT NULL)
    insert_own_candidate_events  TO authenticated, anon  WITH CHECK (agency_id IS NOT NULL)
    insert_own_audit_logs        TO authenticated, anon  WITH CHECK (agency_id IS NOT NULL)

`agency_id IS NOT NULL` tests existence, not ownership. These are named `insert_own_*`,
which reads as if they were scoped, and that naming is why the earlier sweep for
`public_insert_*` did not find them. The signature to grep for is the WITH CHECK clause,
not the policy name — six policies shared it, three were closed in 20260816130000, these
are the remaining three.

Verified against the live project before the fix:

    anon POST /rest/v1/audit_logs       {"agency_id": "<Agency B>", "action": "..."}  -> 201
    anon POST /rest/v1/lead_events      {"agency_id": "<Agency B>", ...}              -> 201
    anon POST /rest/v1/candidate_events {"agency_id": "<Agency B>", ...}              -> 201

and the same for an authenticated user of Agency A writing into Agency B.

`audit_logs` is the serious one. An anonymous caller could write entries into any agency's
audit trail. For a compliance module, forged audit records are worse than leaked reads:
the trail is the artefact you would rely on to reconstruct what happened, and it could be
authored by anyone.

Exposure window audited before closing. The only rows created through this route were the
security probes themselves ('probe', 'FORGED_BY_ANON', both in the Agency B fixture);
they are removed below. Legitimate fixture rows are left intact.

These writes belong to the application, not to the browser. When the event and audit write
methods are added to IRepository they must go through a trusted server path, the same way
public_create_lead() handles the public funnel.
*/

DROP POLICY IF EXISTS "insert_own_lead_events" ON lead_events;
CREATE POLICY "insert_own_lead_events"
ON lead_events FOR INSERT
TO authenticated
WITH CHECK (agency_id = user_agency_id());

DROP POLICY IF EXISTS "insert_own_candidate_events" ON candidate_events;
CREATE POLICY "insert_own_candidate_events"
ON candidate_events FOR INSERT
TO authenticated
WITH CHECK (agency_id = user_agency_id());

DROP POLICY IF EXISTS "insert_own_audit_logs" ON audit_logs;
CREATE POLICY "insert_own_audit_logs"
ON audit_logs FOR INSERT
TO authenticated
WITH CHECK (agency_id = user_agency_id());

-- Remove the rows the security probes committed while the hole was open.
DELETE FROM audit_logs       WHERE action     IN ('probe', 'FORGED_BY_ANON');
DELETE FROM lead_events      WHERE event_type IN ('probe', 'FORGED_BY_ANON');
DELETE FROM candidate_events WHERE event_type IN ('probe', 'FORGED_BY_ANON');
