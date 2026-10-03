import type {
  AppointmentStatus,
  CandidateStatus,
  CheckupResponses,
  ContentAsset,
  ContentStatus,
  LeadStatus,
} from '@/lib/types';

/*
Repository input contract.

Domain models in `@/lib/types` describe rows as they come *out* of storage. They are the
wrong shape for writes: they carry fields a caller must never choose. Passing `Partial<T>`
to a write let the browser propose `agency_id`, `id`, `score` or `status`; DemoRepository
happened to discard them, but that was an implementation detail, not a guarantee.

The types below are the write contract. Every field a caller may legitimately supply is
present; everything else is the system's to decide.

SERVER-CONTROLLED — never accepted from a caller:
  id             assigned by storage
  agency_id      resolved from the trusted tenant context, never from client input
  created_at     assigned by storage
  updated_at     assigned by storage
  last_activity  maintained by the repository on write
  status         lifecycle owned by the repository (new / requested / draft on create)
  score          derived by the repository from the submitted answers
  score_tier     derived alongside score
  score_breakdown derived alongside score
  created_by     the acting user, resolved from the session (see TODO below)
  reviewer       set by the compliance workflow
  approval_date  set by the compliance workflow
  version        maintained by the repository

Excluding these from the types is necessary but NOT sufficient. TypeScript is erased at
runtime, so a hand-crafted HTTP request bypasses it entirely. Tenant safety needs all
three layers: these types, server-side tenant resolution, and RLS policies that reject
cross-tenant writes. This file is only the first of the three.
*/

// --- Leads ---

export interface CreateLeadInput {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  consent: boolean;
  source?: string;
  campaign_id?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  interest?: string | null;
  consent_method?: string | null;
  preferred_contact?: string | null;
  /** Drives the derived score and tier; the caller does not supply either. */
  checkup_responses?: CheckupResponses | null;
  ai_summary?: string | null;
}

export interface UpdateLeadInput {
  status?: LeadStatus;
  assigned_agent_id?: string | null;
  notes?: string | null;
  interest?: string | null;
  preferred_contact?: string | null;
}

// --- Appointments ---

export interface CreateAppointmentInput {
  lead_id: string;
  date: string;
  time: string;
  agent_id?: string | null;
  meeting_type?: string;
  notes?: string | null;
}

export interface UpdateAppointmentInput {
  status?: AppointmentStatus;
  agent_id?: string | null;
  date?: string;
  time?: string;
  meeting_type?: string;
  notes?: string | null;
}

// --- Candidates ---

export interface CreateCandidateInput {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  state: string;
  current_occupation: string;
  years_experience: string;
  why_interested: string;
  sales_experience: string;
  financial_services_experience: string;
  preferred_contact: string;
}

export interface UpdateCandidateInput {
  status?: CandidateStatus;
  assigned_agent_id?: string | null;
}

// --- Content assets ---

export interface CreateContentAssetInput {
  title: string;
  type: ContentAsset['type'];
  content: string;
  ai_generated?: boolean;
}

/*
ARCHITECTURAL TODO — event and audit writes.

`getLeadEvents`, `getCandidateEvents` and `getAuditLogs` can read three tables that
nothing in the application ever writes. The demo rows are seeded. A financial-services
product with a compliance module needs those writes, but their API is not designed yet
and is deliberately out of scope for this pass. Two distinct problems, not one:

  - Domain events (LeadEvent, CandidateEvent) may be written by the application.
  - Audit records must not be application-authored. The actor, the timestamp and the
    before/after values have to come from a trusted context, or an agent could record
    an action under someone else's name.

`created_by` on CreateContentAssetInput is the same problem in miniature: the compliance
page currently hardcodes an agent id. The repository fills it in for now; it must come
from the session once real auth exists.
*/

/*
ERROR POLICY.

The contract stays `Promise<T>` — no `Result<T, E>`. Failures are thrown.

The rule that matters for SupabaseRepository:

  A storage failure MUST throw. It must never be reported as an empty list or a null.

`[]` means "this tenant has no rows". `null` means "no row with that id". Neither may
ever mean "the query failed" — a dashboard rendering "0 leads" after a connection error
tells the user something false about their own business.
*/
export class RepositoryError extends Error {
  readonly operation: string;

  constructor(operation: string, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'RepositoryError';
    this.operation = operation;
  }
}
