/*
# Create appointments, candidates, candidate_events tables

1. New Tables
- `appointments`: Meetings between leads and agents.
  - id, agency_id, lead_id (FK), agent_id (nullable FK -> agents)
  - date, time, meeting_type, status, notes
  - created_at, updated_at
  - status: requested, scheduled, confirmed, completed, no_show, cancelled, follow_up_required

- `candidates`: Recruiting candidates from the career funnel.
  - id, agency_id, first_name, last_name, email, phone, state
  - current_occupation, years_experience, why_interested
  - sales_experience, financial_services_experience, preferred_contact
  - status (new, contacted, discovery_call, licensing, licensed, onboarded, nurture, declined)
  - score (0-100), score_breakdown (jsonb), assigned_agent_id
  - created_at

- `candidate_events`: Timeline events per candidate.
  - id, candidate_id (FK), agency_id, event_type, description, created_at

2. Security
- Appointments: SELECT authenticated scoped to agency. INSERT by anon+authenticated (public can request appointments from the checkup flow). UPDATE/DELETE authenticated scoped to agency.
- Candidates: INSERT by anon+authenticated (public career form). SELECT/UPDATE/DELETE authenticated scoped to agency.
- candidate_events: SELECT authenticated scoped. INSERT by anon+authenticated.
*/

CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES agents(id) ON DELETE SET NULL,
  date date NOT NULL,
  time text NOT NULL,
  meeting_type text NOT NULL DEFAULT 'Educational Consultation',
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'scheduled', 'confirmed', 'completed', 'no_show', 'cancelled', 'follow_up_required')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Public can request appointments (from financial checkup CTA)
DROP POLICY IF EXISTS "public_insert_appointments" ON appointments;
CREATE POLICY "public_insert_appointments"
ON appointments FOR INSERT
TO anon, authenticated
WITH CHECK (agency_id IS NOT NULL);

DROP POLICY IF EXISTS "select_own_appointments" ON appointments;
CREATE POLICY "select_own_appointments"
ON appointments FOR SELECT
TO authenticated
USING (agency_id = user_agency_id());

DROP POLICY IF EXISTS "update_own_appointments" ON appointments;
CREATE POLICY "update_own_appointments"
ON appointments FOR UPDATE
TO authenticated
USING (agency_id = user_agency_id())
WITH CHECK (agency_id = user_agency_id());

DROP POLICY IF EXISTS "delete_own_appointments" ON appointments;
CREATE POLICY "delete_own_appointments"
ON appointments FOR DELETE
TO authenticated
USING (agency_id = user_agency_id());

CREATE INDEX IF NOT EXISTS idx_appointments_agency ON appointments(agency_id);
CREATE INDEX IF NOT EXISTS idx_appointments_lead ON appointments(lead_id);
CREATE INDEX IF NOT EXISTS idx_appointments_agent ON appointments(agent_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);

CREATE TABLE IF NOT EXISTS candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  state text,
  current_occupation text,
  years_experience text,
  why_interested text,
  sales_experience text DEFAULT 'none',
  financial_services_experience text DEFAULT 'none',
  preferred_contact text DEFAULT 'email',
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'discovery_call', 'licensing', 'licensed', 'onboarded', 'nurture', 'declined')),
  score integer NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  score_breakdown jsonb NOT NULL DEFAULT '{}',
  assigned_agent_id uuid REFERENCES agents(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

-- Public can submit candidate interest forms (from career page)
DROP POLICY IF EXISTS "public_insert_candidates" ON candidates;
CREATE POLICY "public_insert_candidates"
ON candidates FOR INSERT
TO anon, authenticated
WITH CHECK (agency_id IS NOT NULL);

DROP POLICY IF EXISTS "select_own_candidates" ON candidates;
CREATE POLICY "select_own_candidates"
ON candidates FOR SELECT
TO authenticated
USING (agency_id = user_agency_id());

DROP POLICY IF EXISTS "update_own_candidates" ON candidates;
CREATE POLICY "update_own_candidates"
ON candidates FOR UPDATE
TO authenticated
USING (agency_id = user_agency_id())
WITH CHECK (agency_id = user_agency_id());

DROP POLICY IF EXISTS "delete_own_candidates" ON candidates;
CREATE POLICY "delete_own_candidates"
ON candidates FOR DELETE
TO authenticated
USING (agency_id = user_agency_id());

CREATE INDEX IF NOT EXISTS idx_candidates_agency ON candidates(agency_id);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidates_score ON candidates(score DESC);
CREATE INDEX IF NOT EXISTS idx_candidates_created_at ON candidates(created_at DESC);

CREATE TABLE IF NOT EXISTS candidate_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE candidate_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_candidate_events" ON candidate_events;
CREATE POLICY "select_own_candidate_events"
ON candidate_events FOR SELECT
TO authenticated
USING (agency_id = user_agency_id());

DROP POLICY IF EXISTS "insert_own_candidate_events" ON candidate_events;
CREATE POLICY "insert_own_candidate_events"
ON candidate_events FOR INSERT
TO authenticated, anon
WITH CHECK (agency_id IS NOT NULL);

DROP POLICY IF EXISTS "delete_own_candidate_events" ON candidate_events;
CREATE POLICY "delete_own_candidate_events"
ON candidate_events FOR DELETE
TO authenticated
USING (agency_id = user_agency_id());

CREATE INDEX IF NOT EXISTS idx_candidate_events_candidate ON candidate_events(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_events_agency ON candidate_events(agency_id);
