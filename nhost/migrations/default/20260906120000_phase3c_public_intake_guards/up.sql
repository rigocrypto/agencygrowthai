BEGIN;

ALTER TABLE public.leads
  ADD COLUMN idempotency_key uuid,
  ADD COLUMN idempotency_fingerprint text,
  ADD CONSTRAINT leads_idempotency_fingerprint_format
    CHECK (idempotency_fingerprint IS NULL OR idempotency_fingerprint ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT leads_agency_id_idempotency_key_key
    UNIQUE (agency_id, idempotency_key);

ALTER TABLE public.candidates
  ADD COLUMN idempotency_key uuid,
  ADD COLUMN idempotency_fingerprint text,
  ADD CONSTRAINT candidates_idempotency_fingerprint_format
    CHECK (idempotency_fingerprint IS NULL OR idempotency_fingerprint ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT candidates_agency_id_idempotency_key_key
    UNIQUE (agency_id, idempotency_key);

ALTER TABLE public.appointments
  ADD COLUMN idempotency_key uuid,
  ADD COLUMN idempotency_fingerprint text,
  ADD CONSTRAINT appointments_idempotency_fingerprint_format
    CHECK (idempotency_fingerprint IS NULL OR idempotency_fingerprint ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT appointments_agency_id_idempotency_key_key
    UNIQUE (agency_id, idempotency_key);

COMMIT;
