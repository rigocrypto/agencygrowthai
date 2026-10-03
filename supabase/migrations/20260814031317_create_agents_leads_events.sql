/*
# Create agents, leads, lead_events tables

1. New Tables
- `agents`: Agents within an agency.
  - id, agency_id, user_id (nullable FK to auth.users), first_name, last_name, email, phone
  - role (PROTECTED — not directly user-editable), status, license_status, bio, created_at

- `leads`: Prospect records captured from public funnels.
  - id, agency_id, first_name, last_name, email, phone
  - source, campaign_id (nullable FK), utm_source, utm_medium, utm_campaign
  - status, score (0-100), score_tier, interest, assigned_agent_id
  - consent, consent_method, preferred_contact, checkup_responses (jsonb)
  - ai_summary, notes, last_activity, created_at

- `lead_events`: Timeline events per lead.
  - id, lead_id (FK), agency_id, event_type, description, metadata, created_at

2. Security
- RLS on all tables.
- Leads INSERT: public (anon + authenticated) can insert, but ONLY with consent=true.
  This is the public funnel entry point (financial checkup form).
- Leads SELECT/UPDATE/DELETE: authenticated users scoped to their agency.
- Agents: authenticated SELECT scoped to agency; admin-only INSERT/UPDATE/DELETE.
- lead_events: SELECT authenticated scoped to agency; INSERT by authenticated + anon.
*/

CREATE TABLE IF NOT EXISTS agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  role text NOT NULL DEFAULT 'agent' CHECK (role IN ('agency_owner', 'agency_admin', 'agent', 'marketing_manager')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  license_status text NOT NULL DEFAULT 'unlicensed' CHECK (license_status IN ('licensed', 'pending', 'unlicensed')),
  bio text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_agents" ON agents;
CREATE POLICY "select_own_agents"
ON agents FOR SELECT
TO authenticated
USING (agency_id = user_agency_id());

DROP POLICY IF EXISTS "insert_own_agents_admin" ON agents;
CREATE POLICY "insert_own_agents_admin"
ON agents FOR INSERT
TO authenticated
WITH CHECK (agency_id = user_agency_id() AND is_agency_admin());

DROP POLICY IF EXISTS "update_own_agents_admin" ON agents;
CREATE POLICY "update_own_agents_admin"
ON agents FOR UPDATE
TO authenticated
USING (agency_id = user_agency_id() AND is_agency_admin())
WITH CHECK (agency_id = user_agency_id() AND is_agency_admin());

DROP POLICY IF EXISTS "delete_own_agents_admin" ON agents;
CREATE POLICY "delete_own_agents_admin"
ON agents FOR DELETE
TO authenticated
USING (agency_id = user_agency_id() AND is_agency_admin());

CREATE INDEX IF NOT EXISTS idx_agents_agency ON agents(agency_id);

CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  source text NOT NULL DEFAULT 'direct',
  campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'appointment', 'client', 'nurture', 'lost')),
  score integer NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  score_tier text NOT NULL DEFAULT 'low' CHECK (score_tier IN ('low', 'moderate', 'high', 'priority')),
  interest text,
  assigned_agent_id uuid REFERENCES agents(id) ON DELETE SET NULL,
  consent boolean NOT NULL DEFAULT false,
  consent_method text,
  preferred_contact text,
  checkup_responses jsonb,
  ai_summary text,
  notes text,
  last_activity timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_insert_leads" ON leads;
CREATE POLICY "public_insert_leads"
ON leads FOR INSERT
TO anon, authenticated
WITH CHECK (consent = true);

DROP POLICY IF EXISTS "select_own_leads" ON leads;
CREATE POLICY "select_own_leads"
ON leads FOR SELECT
TO authenticated
USING (agency_id = user_agency_id());

DROP POLICY IF EXISTS "update_own_leads" ON leads;
CREATE POLICY "update_own_leads"
ON leads FOR UPDATE
TO authenticated
USING (agency_id = user_agency_id())
WITH CHECK (agency_id = user_agency_id());

DROP POLICY IF EXISTS "delete_own_leads" ON leads;
CREATE POLICY "delete_own_leads"
ON leads FOR DELETE
TO authenticated
USING (agency_id = user_agency_id());

CREATE INDEX IF NOT EXISTS idx_leads_agency ON leads(agency_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_agent ON leads(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

CREATE TABLE IF NOT EXISTS lead_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  description text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lead_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_lead_events" ON lead_events;
CREATE POLICY "select_own_lead_events"
ON lead_events FOR SELECT
TO authenticated
USING (agency_id = user_agency_id());

DROP POLICY IF EXISTS "insert_own_lead_events" ON lead_events;
CREATE POLICY "insert_own_lead_events"
ON lead_events FOR INSERT
TO authenticated, anon
WITH CHECK (agency_id IS NOT NULL);

DROP POLICY IF EXISTS "delete_own_lead_events" ON lead_events;
CREATE POLICY "delete_own_lead_events"
ON lead_events FOR DELETE
TO authenticated
USING (agency_id = user_agency_id());

CREATE INDEX IF NOT EXISTS idx_lead_events_lead ON lead_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_events_agency ON lead_events(agency_id);
