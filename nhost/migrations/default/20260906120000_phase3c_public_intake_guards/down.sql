BEGIN;

ALTER TABLE public.appointments
  DROP CONSTRAINT appointments_agency_id_idempotency_key_key,
  DROP CONSTRAINT appointments_idempotency_fingerprint_format,
  DROP COLUMN idempotency_fingerprint,
  DROP COLUMN idempotency_key;

ALTER TABLE public.candidates
  DROP CONSTRAINT candidates_agency_id_idempotency_key_key,
  DROP CONSTRAINT candidates_idempotency_fingerprint_format,
  DROP COLUMN idempotency_fingerprint,
  DROP COLUMN idempotency_key;

ALTER TABLE public.leads
  DROP CONSTRAINT leads_agency_id_idempotency_key_key,
  DROP CONSTRAINT leads_idempotency_fingerprint_format,
  DROP COLUMN idempotency_fingerprint,
  DROP COLUMN idempotency_key;

COMMIT;
