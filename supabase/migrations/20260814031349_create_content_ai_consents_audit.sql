/*
# Create content_assets, content_reviews, ai_interactions, consents, audit_logs tables

1. New Tables
- `content_assets`: Marketing content with compliance workflow.
  - id, agency_id, title, type (social_post, email, landing_page, educational_article, ad_copy)
  - content (text), status (draft, pending_review, approved, published, rejected, archived)
  - created_by, reviewer (nullable), approval_date (nullable), version (int)
  - ai_generated (boolean), created_at, updated_at

- `content_reviews`: Review records for each content asset version.
  - id, content_asset_id (FK), agency_id, reviewer, action, comment, created_at

- `ai_interactions`: Log of AI assistant interactions for auditability.
  - id, agency_id, user_id (nullable), interaction_type, input (text), output (text), created_at

- `consents`: Consent records for lead data processing.
  - id, agency_id, lead_id (nullable FK), consent_type, consent_text, ip_hash, created_at

- `audit_logs`: Audit trail for security and compliance.
  - id, agency_id, user_id (nullable), action, entity_type, entity_id (nullable), metadata (jsonb), created_at

2. Security
- content_assets: SELECT authenticated scoped to agency. INSERT/UPDATE/DELETE authenticated scoped to agency.
  Status transitions to 'published' require admin (enforced in app layer + future DB trigger).
- content_reviews: SELECT/INSERT authenticated scoped to agency.
- ai_interactions: INSERT authenticated scoped. SELECT admin-only.
- consents: INSERT by anon+authenticated. SELECT authenticated scoped to agency.
- audit_logs: INSERT by authenticated+anon. SELECT admin-only (sensitive).
*/

CREATE TABLE IF NOT EXISTS content_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('social_post', 'email', 'landing_page', 'educational_article', 'ad_copy')),
  content text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'published', 'rejected', 'archived')),
  created_by uuid REFERENCES agents(id) ON DELETE SET NULL,
  reviewer uuid REFERENCES agents(id) ON DELETE SET NULL,
  approval_date timestamptz,
  version integer NOT NULL DEFAULT 1,
  ai_generated boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE content_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_content" ON content_assets;
CREATE POLICY "select_own_content"
ON content_assets FOR SELECT
TO authenticated
USING (agency_id = user_agency_id());

DROP POLICY IF EXISTS "insert_own_content" ON content_assets;
CREATE POLICY "insert_own_content"
ON content_assets FOR INSERT
TO authenticated
WITH CHECK (agency_id = user_agency_id());

DROP POLICY IF EXISTS "update_own_content" ON content_assets;
CREATE POLICY "update_own_content"
ON content_assets FOR UPDATE
TO authenticated
USING (agency_id = user_agency_id())
WITH CHECK (agency_id = user_agency_id());

DROP POLICY IF EXISTS "delete_own_content" ON content_assets;
CREATE POLICY "delete_own_content"
ON content_assets FOR DELETE
TO authenticated
USING (agency_id = user_agency_id());

CREATE INDEX IF NOT EXISTS idx_content_agency ON content_assets(agency_id);
CREATE INDEX IF NOT EXISTS idx_content_status ON content_assets(status);

CREATE TABLE IF NOT EXISTS content_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_asset_id uuid NOT NULL REFERENCES content_assets(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  reviewer uuid REFERENCES agents(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('submit_review', 'approve', 'reject', 'publish', 'archive', 'request_revision')),
  comment text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE content_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_content_reviews" ON content_reviews;
CREATE POLICY "select_own_content_reviews"
ON content_reviews FOR SELECT
TO authenticated
USING (agency_id = user_agency_id());

DROP POLICY IF EXISTS "insert_own_content_reviews" ON content_reviews;
CREATE POLICY "insert_own_content_reviews"
ON content_reviews FOR INSERT
TO authenticated
WITH CHECK (agency_id = user_agency_id());

CREATE INDEX IF NOT EXISTS idx_content_reviews_asset ON content_reviews(content_asset_id);

CREATE TABLE IF NOT EXISTS ai_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  interaction_type text NOT NULL,
  input text,
  output text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ai_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_ai_interactions" ON ai_interactions;
CREATE POLICY "select_own_ai_interactions"
ON ai_interactions FOR SELECT
TO authenticated
USING (agency_id = user_agency_id() AND is_agency_admin());

DROP POLICY IF EXISTS "insert_own_ai_interactions" ON ai_interactions;
CREATE POLICY "insert_own_ai_interactions"
ON ai_interactions FOR INSERT
TO authenticated
WITH CHECK (agency_id = user_agency_id());

CREATE INDEX IF NOT EXISTS idx_ai_interactions_agency ON ai_interactions(agency_id);

CREATE TABLE IF NOT EXISTS consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  consent_type text NOT NULL,
  consent_text text NOT NULL,
  ip_hash text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_insert_consents" ON consents;
CREATE POLICY "public_insert_consents"
ON consents FOR INSERT
TO anon, authenticated
WITH CHECK (agency_id IS NOT NULL);

DROP POLICY IF EXISTS "select_own_consents" ON consents;
CREATE POLICY "select_own_consents"
ON consents FOR SELECT
TO authenticated
USING (agency_id = user_agency_id());

CREATE INDEX IF NOT EXISTS idx_consents_agency ON consents(agency_id);
CREATE INDEX IF NOT EXISTS idx_consents_lead ON consents(lead_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_audit_logs" ON audit_logs;
CREATE POLICY "select_own_audit_logs"
ON audit_logs FOR SELECT
TO authenticated
USING (agency_id = user_agency_id() AND is_agency_admin());

DROP POLICY IF EXISTS "insert_own_audit_logs" ON audit_logs;
CREATE POLICY "insert_own_audit_logs"
ON audit_logs FOR INSERT
TO authenticated, anon
WITH CHECK (agency_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_audit_logs_agency ON audit_logs(agency_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
