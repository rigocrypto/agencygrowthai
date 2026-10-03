BEGIN;

ALTER TABLE public.agents
ADD CONSTRAINT agents_user_id_unique UNIQUE (user_id);

COMMIT;
