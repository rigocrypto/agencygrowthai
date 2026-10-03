/*
# Create agencies and settings tables — multi-tenant foundation

1. New Tables
- `agencies`: Top-level tenant entity. Each agency is a separate financial-service organization.
  - id (uuid PK)
  - name (text, not null)
  - domain (text, nullable)
  - primary_color, secondary_color (text, default professional palette)
  - contact_email, contact_phone (text)
  - default_calendar_url (text, nullable)
  - compliance_disclaimer, career_disclaimer, financial_education_disclaimer (text)
  - privacy_policy_url, terms_url (text, nullable)
  - created_at, updated_at (timestamptz)

- `settings`: Agency-level configurable variables (lead scoring rules, appointment types, etc.)
  - id (uuid PK)
  - agency_id (uuid FK -> agencies)
  - key (text)
  - value (jsonb)
  - created_at, updated_at (timestamptz)

2. Security
- RLS enabled on both tables.
- Agencies: only authenticated users belonging to the agency can SELECT. INSERT/UPDATE only by agency owners/admins.
- Settings: same pattern — authenticated users scoped to their agency.
- A helper function `user_agency_id()` returns the agency_id from the authenticated user's JWT app metadata.
*/

CREATE TABLE IF NOT EXISTS agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  domain text,
  primary_color text DEFAULT '#0f766e',
  secondary_color text DEFAULT '#0c4a6e',
  contact_email text NOT NULL,
  contact_phone text,
  default_calendar_url text,
  compliance_disclaimer text DEFAULT 'Compliance workflows are organizational controls and do not replace applicable laws, regulations, carrier/broker-dealer requirements, or professional review.',
  privacy_policy_url text,
  terms_url text,
  career_disclaimer text DEFAULT 'This is an independent-contractor opportunity, not an offer of employment. Earnings depend on individual effort, market conditions, and applicable licensing. No income is guaranteed.',
  financial_education_disclaimer text DEFAULT 'The information provided is educational only and is not individualized financial, investment, tax, or legal advice.',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;

-- Helper: get the authenticated user's agency_id from JWT app metadata
CREATE OR REPLACE FUNCTION user_agency_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (auth.jwt() -> 'app_user_data' ->> 'agency_id')::uuid
$$;

-- Helper: check if user is agency owner or admin
CREATE OR REPLACE FUNCTION is_agency_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_user_data' ->> 'role') IN ('agency_owner', 'agency_admin'),
    false
  )
$$;

DROP POLICY IF EXISTS "select_own_agency" ON agencies;
CREATE POLICY "select_own_agency"
ON agencies FOR SELECT
TO authenticated
USING (id = user_agency_id());

DROP POLICY IF EXISTS "update_own_agency_admin" ON agencies;
CREATE POLICY "update_own_agency_admin"
ON agencies FOR UPDATE
TO authenticated
USING (id = user_agency_id() AND is_agency_admin())
WITH CHECK (id = user_agency_id() AND is_agency_admin());

CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  key text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(agency_id, key)
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_settings" ON settings;
CREATE POLICY "select_own_settings"
ON settings FOR SELECT
TO authenticated
USING (agency_id = user_agency_id());

DROP POLICY IF EXISTS "insert_own_settings_admin" ON settings;
CREATE POLICY "insert_own_settings_admin"
ON settings FOR INSERT
TO authenticated
WITH CHECK (agency_id = user_agency_id() AND is_agency_admin());

DROP POLICY IF EXISTS "update_own_settings_admin" ON settings;
CREATE POLICY "update_own_settings_admin"
ON settings FOR UPDATE
TO authenticated
USING (agency_id = user_agency_id() AND is_agency_admin())
WITH CHECK (agency_id = user_agency_id() AND is_agency_admin());

DROP POLICY IF EXISTS "delete_own_settings_admin" ON settings;
CREATE POLICY "delete_own_settings_admin"
ON settings FOR DELETE
TO authenticated
USING (agency_id = user_agency_id() AND is_agency_admin());

CREATE INDEX IF NOT EXISTS idx_settings_agency ON settings(agency_id);
