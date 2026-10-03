BEGIN;

CREATE TABLE public.agencies (
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
  public_slug text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  key text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (agency_id, key)
);

CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
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

CREATE TABLE public.campaign_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  description text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
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

CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  source text NOT NULL DEFAULT 'direct',
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'appointment', 'client', 'nurture', 'lost')),
  score integer NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  score_tier text NOT NULL DEFAULT 'low' CHECK (score_tier IN ('low', 'moderate', 'high', 'priority')),
  interest text,
  assigned_agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  consent boolean NOT NULL DEFAULT false,
  consent_method text,
  preferred_contact text,
  checkup_responses jsonb,
  ai_summary text,
  notes text,
  last_activity timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.lead_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  description text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  date date NOT NULL,
  time text NOT NULL,
  meeting_type text NOT NULL DEFAULT 'Educational Consultation',
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'scheduled', 'confirmed', 'completed', 'no_show', 'cancelled', 'follow_up_required')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
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
  assigned_agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.candidate_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.content_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('social_post', 'email', 'landing_page', 'educational_article', 'ad_copy')),
  content text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'published', 'rejected', 'archived')),
  created_by uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  reviewer uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  approval_date timestamptz,
  version integer NOT NULL DEFAULT 1,
  ai_generated boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.content_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_asset_id uuid NOT NULL REFERENCES public.content_assets(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  reviewer uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('submit_review', 'approve', 'reject', 'publish', 'archive', 'request_revision')),
  comment text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.ai_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  interaction_type text NOT NULL,
  input text,
  output text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  consent_type text NOT NULL,
  consent_text text NOT NULL,
  ip_hash text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_settings_agency ON public.settings (agency_id);
CREATE INDEX idx_campaigns_agency ON public.campaigns (agency_id);
CREATE INDEX idx_campaign_events_campaign ON public.campaign_events (campaign_id);
CREATE INDEX idx_campaign_events_agency ON public.campaign_events (agency_id);
CREATE INDEX idx_agents_agency ON public.agents (agency_id);
CREATE INDEX agents_user_id_idx ON public.agents (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_leads_agency ON public.leads (agency_id);
CREATE INDEX idx_leads_status ON public.leads (status);
CREATE INDEX idx_leads_score ON public.leads (score DESC);
CREATE INDEX idx_leads_assigned_agent ON public.leads (assigned_agent_id);
CREATE INDEX idx_leads_created_at ON public.leads (created_at DESC);
CREATE INDEX idx_lead_events_lead ON public.lead_events (lead_id);
CREATE INDEX idx_lead_events_agency ON public.lead_events (agency_id);
CREATE INDEX idx_appointments_agency ON public.appointments (agency_id);
CREATE INDEX idx_appointments_lead ON public.appointments (lead_id);
CREATE INDEX idx_appointments_agent ON public.appointments (agent_id);
CREATE INDEX idx_appointments_status ON public.appointments (status);
CREATE INDEX idx_appointments_date ON public.appointments (date);
CREATE INDEX idx_candidates_agency ON public.candidates (agency_id);
CREATE INDEX idx_candidates_status ON public.candidates (status);
CREATE INDEX idx_candidates_score ON public.candidates (score DESC);
CREATE INDEX idx_candidates_created_at ON public.candidates (created_at DESC);
CREATE INDEX idx_candidate_events_candidate ON public.candidate_events (candidate_id);
CREATE INDEX idx_candidate_events_agency ON public.candidate_events (agency_id);
CREATE INDEX idx_content_agency ON public.content_assets (agency_id);
CREATE INDEX idx_content_status ON public.content_assets (status);
CREATE INDEX idx_content_reviews_asset ON public.content_reviews (content_asset_id);
CREATE INDEX idx_ai_interactions_agency ON public.ai_interactions (agency_id);
CREATE INDEX idx_consents_agency ON public.consents (agency_id);
CREATE INDEX idx_consents_lead ON public.consents (lead_id);
CREATE INDEX idx_audit_logs_agency ON public.audit_logs (agency_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs (created_at DESC);

COMMIT;
