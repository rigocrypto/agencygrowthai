BEGIN;

ALTER TABLE public.agents
DROP CONSTRAINT IF EXISTS agents_user_id_unique;

COMMIT;
