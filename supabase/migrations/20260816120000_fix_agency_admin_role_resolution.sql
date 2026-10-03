/*
# Resolve the admin role from the membership record, not from a JWT claim

The previous migration fixed user_agency_id(), which resolved the tenant from a
non-existent `app_user_data` JWT claim. is_agency_admin() has the same defect and was
missed, because no test exercised a table that depends on it:

    SELECT COALESCE((auth.jwt() -> 'app_user_data' ->> 'role') IN (...), false)

Supabase never populates `app_user_data`, so the function returns false for every user,
including agency owners. Two policies AND it with the tenant check:

    select_own_ai_interactions  USING (agency_id = user_agency_id() AND is_agency_admin())
    select_own_audit_logs       USING (agency_id = user_agency_id() AND is_agency_admin())

Effect: an agency owner cannot read their own audit trail or AI interaction history. That
fails closed, so it is not a data leak — it is a lockout, and it silently disables the
compliance audit trail for everyone.

Found by tests-tenant/multi-table-isolation.spec.ts, which asserts that each tenant can
see its own seeded row in every tenant-owned table. Both tables returned zero rows for
their own owner.

The fix mirrors user_agency_id(): read the role from the agents membership row, which the
user cannot edit, instead of from a token claim.
*/

CREATE OR REPLACE FUNCTION is_agency_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM agents
    WHERE user_id = auth.uid()
      AND status = 'active'
      AND role IN ('agency_owner', 'agency_admin')
  )
$$;

COMMENT ON FUNCTION is_agency_admin() IS
  'True when the caller holds an active agency_owner/agency_admin membership row. Never reads client-supplied input.';
