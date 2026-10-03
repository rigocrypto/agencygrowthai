/*
# Create campaigns and campaign_events tables

1. New Tables
- `campaigns`: Marketing campaigns tracked by agency.
  - id, agency_id, name, platform, campaign_type, landing_page
  - utm_source, utm_medium, utm_campaign
  - budget (numeric, nullable), status (active, paused, completed)
  - created_at

- `campaign_events`: Events tracking campaign performance over time.
  - id, campaign_id (FK), agency_id, event_type, description, metadata (jsonb), created_at

2. Security
- RLS on both tables, scoped to user_agency_id().
- SELECT: authenticated users scoped to their agency.
- INSERT/UPDATE/DELETE: admin-only.
*/

CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('facebook', 'instagram', 'linkedin', 'google', 'tiktok', 'youtube', 'organic', 'referral', 'direct')),
  campaign_type text NOT NULL DEFAULT 'lead_gen',
  landing_page text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  budget numeric(10, 2),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_campaigns" ON campaigns;
CREATE POLICY "select_own_campaigns"
ON campaigns FOR SELECT
TO authenticated
USING (agency_id = user_agency_id());

DROP POLICY IF EXISTS "insert_own_campaigns_admin" ON campaigns;
CREATE POLICY "insert_own_campaigns_admin"
ON campaigns FOR INSERT
TO authenticated
WITH CHECK (agency_id = user_agency_id() AND is_agency_admin());

DROP POLICY IF EXISTS "update_own_campaigns_admin" ON campaigns;
CREATE POLICY "update_own_campaigns_admin"
ON campaigns FOR UPDATE
TO authenticated
USING (agency_id = user_agency_id() AND is_agency_admin())
WITH CHECK (agency_id = user_agency_id() AND is_agency_admin());

DROP POLICY IF EXISTS "delete_own_campaigns_admin" ON campaigns;
CREATE POLICY "delete_own_campaigns_admin"
ON campaigns FOR DELETE
TO authenticated
USING (agency_id = user_agency_id() AND is_agency_admin());

CREATE INDEX IF NOT EXISTS idx_campaigns_agency ON campaigns(agency_id);

CREATE TABLE IF NOT EXISTS campaign_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  description text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE campaign_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_campaign_events" ON campaign_events;
CREATE POLICY "select_own_campaign_events"
ON campaign_events FOR SELECT
TO authenticated
USING (agency_id = user_agency_id());

DROP POLICY IF EXISTS "insert_own_campaign_events_admin" ON campaign_events;
CREATE POLICY "insert_own_campaign_events_admin"
ON campaign_events FOR INSERT
TO authenticated
WITH CHECK (agency_id = user_agency_id() AND is_agency_admin());

DROP POLICY IF EXISTS "delete_own_campaign_events" ON campaign_events;
CREATE POLICY "delete_own_campaign_events"
ON campaign_events FOR DELETE
TO authenticated
USING (agency_id = user_agency_id());

CREATE INDEX IF NOT EXISTS idx_campaign_events_campaign ON campaign_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_events_agency ON campaign_events(agency_id);
