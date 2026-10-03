import 'server-only';

import { createHash } from 'node:crypto';
import type { Appointment, Candidate, CheckupResponses, Lead } from '@/lib/types';

type GraphQLResult<T> = { data?: T; errors?: Array<{ message?: string }> };

export class TrustedNhostError extends Error {
  readonly code: 'NOT_CONFIGURED' | 'UNKNOWN_AGENCY' | 'LEAD_NOT_FOUND' | 'IDEMPOTENCY_CONFLICT' | 'UPSTREAM_FAILURE';

  constructor(code: TrustedNhostError['code']) {
    super(code);
    this.name = 'TrustedNhostError';
    this.code = code;
  }
}

function fingerprint(value: Record<string, unknown>): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function assertReplay<T>(row: T & { idempotency_fingerprint: string | null }, expected: string): T {
  if (row.idempotency_fingerprint !== expected) throw new TrustedNhostError('IDEMPOTENCY_CONFLICT');
  const { idempotency_fingerprint: _fingerprint, ...publicRow } = row;
  return publicRow as T;
}

function configuration(): { endpoint: string; adminSecret: string } {
  const subdomain = process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN?.trim();
  const region = process.env.NEXT_PUBLIC_NHOST_REGION?.trim();
  const adminSecret = (
    process.env.HASURA_ADMIN_SECRET
    ?? process.env.HASURA_GRAPHQL_ADMIN_SECRET
    ?? process.env.NHOST_ADMIN_SECRET
  )?.trim();

  if (!subdomain || !region || !adminSecret) throw new TrustedNhostError('NOT_CONFIGURED');
  return {
    endpoint: `https://${subdomain}.hasura.${region}.nhost.run/v1/graphql`,
    adminSecret,
  };
}

async function trustedGraphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const { endpoint, adminSecret } = configuration();
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-hasura-admin-secret': adminSecret,
      },
      body: JSON.stringify({ query, variables }),
      cache: 'no-store',
    });
  } catch {
    throw new TrustedNhostError('UPSTREAM_FAILURE');
  }

  let body: GraphQLResult<T>;
  try {
    body = await response.json() as GraphQLResult<T>;
  } catch {
    console.error('TRUSTED_NHOST_GRAPHQL_FAILURE', {
      status: response.status,
      reason: 'INVALID_JSON_RESPONSE',
    });
    throw new TrustedNhostError('UPSTREAM_FAILURE');
  }
  if (!response.ok || body.errors?.length || !body.data) {
    console.error('TRUSTED_NHOST_GRAPHQL_FAILURE', {
      status: response.status,
      errorCount: body.errors?.length ?? 0,
      hasData: Boolean(body.data),
    });
    throw new TrustedNhostError('UPSTREAM_FAILURE');
  }
  return body.data;
}

async function resolveAgencyId(publicSlug: string): Promise<string> {
  const data = await trustedGraphql<{ agencies: Array<{ id: string }> }>(
    `query ResolvePublicAgency($slug: String!) {
      agencies(where: {public_slug: {_eq: $slug}}, limit: 1) { id }
    }`,
    { slug: publicSlug },
  );
  const agencyId = data.agencies[0]?.id;
  if (!agencyId) throw new TrustedNhostError('UNKNOWN_AGENCY');
  return agencyId;
}

const LEAD_FIELDS = `
  id agency_id first_name last_name email phone source campaign_id utm_source
  utm_medium utm_campaign status score score_tier interest assigned_agent_id
  consent consent_method preferred_contact checkup_responses ai_summary notes
  last_activity created_at
`;
const APPOINTMENT_FIELDS = `
  id agency_id lead_id agent_id date time meeting_type status notes created_at updated_at
`;
const CANDIDATE_FIELDS = `
  id agency_id first_name last_name email phone state current_occupation
  years_experience why_interested sales_experience financial_services_experience
  preferred_contact status score score_breakdown assigned_agent_id created_at
`;

export async function trustedCreateLead(input: {
  idempotencyKey: string;
  agencySlug: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  source: string;
  interest: string | null;
  preferredContact: string | null;
  responses: CheckupResponses;
  score: number;
  scoreTier: Lead['score_tier'];
}): Promise<Lead> {
  const agencyId = await resolveAgencyId(input.agencySlug);
  const aiSummary = `${input.firstName} ${input.lastName} completed the financial checkup. Score: ${input.score}/100. Primary goal: ${input.responses.primary_goal.replace(/_/g, ' ')}.`;
  const consentText = 'I consent to be contacted about my financial checkup results.';
  const requestFingerprint = fingerprint({
    agencyId,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    phone: input.phone,
    source: input.source,
    interest: input.interest,
    preferredContact: input.preferredContact,
    responses: input.responses,
    score: input.score,
    scoreTier: input.scoreTier,
    aiSummary,
    consentText,
  });
  const existing = await trustedGraphql<{ leads: Array<Lead & { idempotency_fingerprint: string | null }> }>(
    `query ExistingPublicLead($agencyId: uuid!, $key: uuid!) {
      leads(where: {agency_id: {_eq: $agencyId}, idempotency_key: {_eq: $key}}, limit: 1) {
        ${LEAD_FIELDS} idempotency_fingerprint
      }
    }`,
    { agencyId, key: input.idempotencyKey },
  );
  if (existing.leads[0]) return assertReplay(existing.leads[0], requestFingerprint);

  const data = await trustedGraphql<{ insert_leads_one: Lead | null }>(
    `mutation TrustedPublicLead($object: leads_insert_input!) {
      insert_leads_one(
        object: $object,
        on_conflict: {constraint: leads_agency_id_idempotency_key_key, update_columns: []}
      ) { ${LEAD_FIELDS} }
    }`,
    {
      object: {
        agency_id: agencyId,
        first_name: input.firstName,
        last_name: input.lastName,
        email: input.email,
        phone: input.phone,
        source: input.source,
        status: 'new',
        score: input.score,
        score_tier: input.scoreTier,
        interest: input.interest,
        consent: true,
        consent_method: 'checkup_form',
        preferred_contact: input.preferredContact,
        checkup_responses: input.responses,
        ai_summary: aiSummary,
        idempotency_key: input.idempotencyKey,
        idempotency_fingerprint: requestFingerprint,
        consents_by_lead_id: {
          data: [{
            agency_id: agencyId,
            consent_type: 'contact',
            consent_text: consentText,
          }],
        },
      },
    },
  );
  if (data.insert_leads_one) return data.insert_leads_one;
  const concurrent = await trustedGraphql<{ leads: Array<Lead & { idempotency_fingerprint: string | null }> }>(
    `query ConcurrentPublicLead($agencyId: uuid!, $key: uuid!) {
      leads(where: {agency_id: {_eq: $agencyId}, idempotency_key: {_eq: $key}}, limit: 1) {
        ${LEAD_FIELDS} idempotency_fingerprint
      }
    }`,
    { agencyId, key: input.idempotencyKey },
  );
  if (!concurrent.leads[0]) throw new TrustedNhostError('UPSTREAM_FAILURE');
  return assertReplay(concurrent.leads[0], requestFingerprint);
}

export async function trustedCreateCandidate(input: {
  idempotencyKey: string;
  agencySlug: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  state: string;
  currentOccupation: string;
  yearsExperience: string;
  whyInterested: string;
  salesExperience: string;
  financialServicesExperience: string;
  preferredContact: string;
  score: number;
  scoreBreakdown: Candidate['score_breakdown'];
}): Promise<Candidate> {
  const agencyId = await resolveAgencyId(input.agencySlug);
  const requestFingerprint = fingerprint({
    agencyId,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    phone: input.phone,
    state: input.state,
    currentOccupation: input.currentOccupation,
    yearsExperience: input.yearsExperience,
    whyInterested: input.whyInterested,
    salesExperience: input.salesExperience,
    financialServicesExperience: input.financialServicesExperience,
    preferredContact: input.preferredContact,
    score: input.score,
    scoreBreakdown: input.scoreBreakdown,
  });
  const existing = await trustedGraphql<{ candidates: Array<Candidate & { idempotency_fingerprint: string | null }> }>(
    `query ExistingPublicCandidate($agencyId: uuid!, $key: uuid!) {
      candidates(where: {agency_id: {_eq: $agencyId}, idempotency_key: {_eq: $key}}, limit: 1) {
        ${CANDIDATE_FIELDS} idempotency_fingerprint
      }
    }`,
    { agencyId, key: input.idempotencyKey },
  );
  if (existing.candidates[0]) return assertReplay(existing.candidates[0], requestFingerprint);

  const data = await trustedGraphql<{ insert_candidates_one: Candidate | null }>(
    `mutation TrustedPublicCandidate($object: candidates_insert_input!) {
      insert_candidates_one(
        object: $object,
        on_conflict: {constraint: candidates_agency_id_idempotency_key_key, update_columns: []}
      ) { ${CANDIDATE_FIELDS} }
    }`,
    {
      object: {
        agency_id: agencyId,
        first_name: input.firstName,
        last_name: input.lastName,
        email: input.email,
        phone: input.phone,
        state: input.state,
        current_occupation: input.currentOccupation,
        years_experience: input.yearsExperience,
        why_interested: input.whyInterested,
        sales_experience: input.salesExperience,
        financial_services_experience: input.financialServicesExperience,
        preferred_contact: input.preferredContact,
        status: 'new',
        score: input.score,
        score_breakdown: input.scoreBreakdown,
        idempotency_key: input.idempotencyKey,
        idempotency_fingerprint: requestFingerprint,
      },
    },
  );
  if (data.insert_candidates_one) return data.insert_candidates_one;
  const concurrent = await trustedGraphql<{ candidates: Array<Candidate & { idempotency_fingerprint: string | null }> }>(
    `query ConcurrentPublicCandidate($agencyId: uuid!, $key: uuid!) {
      candidates(where: {agency_id: {_eq: $agencyId}, idempotency_key: {_eq: $key}}, limit: 1) {
        ${CANDIDATE_FIELDS} idempotency_fingerprint
      }
    }`,
    { agencyId, key: input.idempotencyKey },
  );
  if (!concurrent.candidates[0]) throw new TrustedNhostError('UPSTREAM_FAILURE');
  return assertReplay(concurrent.candidates[0], requestFingerprint);
}

export async function trustedCreateAppointment(input: {
  idempotencyKey: string;
  agencySlug: string;
  leadId: string;
  date: string;
  time: string;
  meetingType: string;
  notes: string | null;
}): Promise<Appointment> {
  const agencyId = await resolveAgencyId(input.agencySlug);
  const lead = await trustedGraphql<{ leads: Array<{ id: string }> }>(
    `query ResolvePublicLead($id: uuid!, $agencyId: uuid!) {
      leads(where: {id: {_eq: $id}, agency_id: {_eq: $agencyId}}, limit: 1) { id }
    }`,
    { id: input.leadId, agencyId },
  );
  if (!lead.leads[0]) throw new TrustedNhostError('LEAD_NOT_FOUND');

  const requestFingerprint = fingerprint({
    agencyId,
    leadId: input.leadId,
    date: input.date,
    time: input.time,
    meetingType: input.meetingType,
    notes: input.notes,
    status: 'requested',
  });
  const existing = await trustedGraphql<{ appointments: Array<Appointment & { idempotency_fingerprint: string | null }> }>(
    `query ExistingPublicAppointment($agencyId: uuid!, $key: uuid!) {
      appointments(where: {agency_id: {_eq: $agencyId}, idempotency_key: {_eq: $key}}, limit: 1) {
        ${APPOINTMENT_FIELDS} idempotency_fingerprint
      }
    }`,
    { agencyId, key: input.idempotencyKey },
  );
  if (existing.appointments[0]) return assertReplay(existing.appointments[0], requestFingerprint);

  const data = await trustedGraphql<{ insert_appointments_one: Appointment | null }>(
    `mutation TrustedPublicAppointment($object: appointments_insert_input!) {
      insert_appointments_one(
        object: $object,
        on_conflict: {constraint: appointments_agency_id_idempotency_key_key, update_columns: []}
      ) { ${APPOINTMENT_FIELDS} }
    }`,
    {
      object: {
        agency_id: agencyId,
        lead_id: input.leadId,
        date: input.date,
        time: input.time,
        meeting_type: input.meetingType,
        status: 'requested',
        notes: input.notes,
        idempotency_key: input.idempotencyKey,
        idempotency_fingerprint: requestFingerprint,
      },
    },
  );
  if (data.insert_appointments_one) return data.insert_appointments_one;
  const concurrent = await trustedGraphql<{ appointments: Array<Appointment & { idempotency_fingerprint: string | null }> }>(
    `query ConcurrentPublicAppointment($agencyId: uuid!, $key: uuid!) {
      appointments(where: {agency_id: {_eq: $agencyId}, idempotency_key: {_eq: $key}}, limit: 1) {
        ${APPOINTMENT_FIELDS} idempotency_fingerprint
      }
    }`,
    { agencyId, key: input.idempotencyKey },
  );
  if (!concurrent.appointments[0]) throw new TrustedNhostError('UPSTREAM_FAILURE');
  return assertReplay(concurrent.appointments[0], requestFingerprint);
}
