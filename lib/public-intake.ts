'use client';

import type { Appointment, Candidate, Lead } from '@/lib/types';
import type { CreateAppointmentInput, CreateCandidateInput, CreateLeadInput } from '@/lib/repo/types';

const PUBLIC_AGENCY_SLUG = process.env.NEXT_PUBLIC_AGENCY_SLUG ?? '';

async function submit<T>(path: string, operation: string, payload: Record<string, unknown>, idempotencyKey: string): Promise<T> {
  if (!PUBLIC_AGENCY_SLUG) throw new Error(`${operation} is not configured for a public agency.`);
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ agency_slug: PUBLIC_AGENCY_SLUG, idempotency_key: idempotencyKey, ...payload }),
  });
  if (!response.ok) throw new Error(`${operation} failed (${response.status}).`);
  return response.json() as Promise<T>;
}

export function createPublicLead(data: CreateLeadInput, idempotencyKey = crypto.randomUUID()): Promise<Lead> {
  return submit('/api/public/leads', 'Public lead intake', {
    first_name: data.first_name,
    last_name: data.last_name,
    email: data.email,
    phone: data.phone,
    consent: data.consent,
    source: data.source ?? 'direct',
    interest: data.interest ?? null,
    preferred_contact: data.preferred_contact ?? null,
    checkup_responses: data.checkup_responses ?? null,
  }, idempotencyKey);
}

export function createPublicCandidate(data: CreateCandidateInput, idempotencyKey = crypto.randomUUID()): Promise<Candidate> {
  return submit('/api/public/candidates', 'Public candidate intake', data as unknown as Record<string, unknown>, idempotencyKey);
}

export function createPublicAppointment(data: CreateAppointmentInput, idempotencyKey = crypto.randomUUID()): Promise<Appointment> {
  return submit('/api/public/appointments', 'Public appointment intake', {
    lead_id: data.lead_id,
    date: data.date,
    time: data.time,
    meeting_type: data.meeting_type ?? 'Educational Consultation',
    notes: data.notes ?? null,
  }, idempotencyKey);
}
