BEGIN;

DROP TABLE IF EXISTS public.audit_logs;
DROP TABLE IF EXISTS public.consents;
DROP TABLE IF EXISTS public.ai_interactions;
DROP TABLE IF EXISTS public.content_reviews;
DROP TABLE IF EXISTS public.content_assets;
DROP TABLE IF EXISTS public.candidate_events;
DROP TABLE IF EXISTS public.candidates;
DROP TABLE IF EXISTS public.appointments;
DROP TABLE IF EXISTS public.lead_events;
DROP TABLE IF EXISTS public.leads;
DROP TABLE IF EXISTS public.agents;
DROP TABLE IF EXISTS public.campaign_events;
DROP TABLE IF EXISTS public.campaigns;
DROP TABLE IF EXISTS public.settings;
DROP TABLE IF EXISTS public.agencies;

COMMIT;
