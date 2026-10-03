'use client';

import { getNhostBrowserClient } from '@/lib/nhost/client';
import type {
  Agency,
  Agent,
  Appointment,
  AuditLog,
  Candidate,
  CandidateEvent,
  Campaign,
  ContentAsset,
  ContentStatus,
  DashboardMetrics,
  Lead,
  LeadEvent,
} from '@/lib/types';
import {
  RepositoryError,
  type CreateAppointmentInput,
  type CreateCandidateInput,
  type CreateContentAssetInput,
  type CreateLeadInput,
  type UpdateAppointmentInput,
  type UpdateCandidateInput,
  type UpdateLeadInput,
} from './types';

type GraphQLData = Record<string, unknown>;

async function query<T extends GraphQLData>(operation: string, document: string, variables?: Record<string, unknown>): Promise<T> {
  const client = getNhostBrowserClient();
  const session = client.getUserSession();

  if (!session?.accessToken || !session.user?.id) {
    throw new RepositoryError(operation, `NHOST_SESSION_REQUIRED: ${operation} requires a real authenticated Nhost session.`);
  }

  try {
    const response = await client.graphql.request<T>({ query: document, variables });
    if (!response.body.data) {
      throw new RepositoryError(operation, `NHOST_GRAPHQL_ERROR: ${operation} returned no data.`);
    }
    return response.body.data;
  } catch (error) {
    if (error instanceof RepositoryError) throw error;
    const detail = error instanceof Error ? error.message : 'Unknown GraphQL failure';
    throw new RepositoryError(operation, `NHOST_GRAPHQL_ERROR: ${detail}`, { cause: error });
  }
}

function writeDisabled(operation: string): never {
  throw new RepositoryError(operation, `NHOST_WRITE_PATH_NOT_ENABLED: ${operation} belongs to Phase 3B.`);
}

function assertUpdateShape(
  operation: string,
  updates: Record<string, unknown>,
  allowedFields: readonly string[],
): void {
  const supplied = Object.keys(updates);
  const forbidden = supplied.filter((field) => !allowedFields.includes(field));
  if (forbidden.length > 0 || supplied.length === 0) {
    throw new RepositoryError(
      operation,
      `NHOST_UPDATE_CONTRACT_REJECTED: ${operation} received fields outside its trusted update contract.`,
    );
  }
}

const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'appointment', 'client', 'nurture', 'lost'] as const;
const APPOINTMENT_STATUSES = ['requested', 'scheduled', 'confirmed', 'completed', 'no_show', 'cancelled', 'follow_up_required'] as const;
const CANDIDATE_STATUSES = ['new', 'contacted', 'discovery_call', 'licensing', 'licensed', 'onboarded', 'nurture', 'declined'] as const;

function assertEnumValue(operation: string, value: unknown, values: readonly string[]): void {
  if (value !== undefined && !values.includes(String(value))) {
    throw new RepositoryError(operation, `NHOST_UPDATE_CONTRACT_REJECTED: ${operation} received an invalid status.`);
  }
}

const AGENCY_FIELDS = `
  id name domain primary_color secondary_color contact_email contact_phone
  default_calendar_url compliance_disclaimer privacy_policy_url terms_url
  career_disclaimer financial_education_disclaimer created_at updated_at
`;
const AGENT_FIELDS = `
  id agency_id first_name last_name email phone role status
  license_status bio created_at
`;
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
  preferred_contact status score assigned_agent_id created_at
`;
const CAMPAIGN_FIELDS = `
  id agency_id name platform campaign_type landing_page utm_source utm_medium
  utm_campaign budget status created_at
`;
const CONTENT_FIELDS = `
  id agency_id title type content status created_by reviewer approval_date
  version ai_generated created_at updated_at
`;

/**
 * Nhost application repository. Reads and the three explicitly enabled Phase 3B
 * updates use only the real browser session. Tenant ownership is never supplied by
 * the browser: Hasura derives it from the Nhost JWT and agents.user_id membership.
 */
export const nhostRepository = {
  isDemo: false as const,

  async getAgency(): Promise<Agency> {
    const data = await query<{ agencies: Agency[] }>('getAgency', `query GetAgency { agencies(limit: 2) { ${AGENCY_FIELDS} } }`);
    if (data.agencies.length !== 1) {
      throw new RepositoryError('getAgency', `NHOST_MEMBERSHIP_ERROR: expected exactly one visible agency, received ${data.agencies.length}.`);
    }
    return data.agencies[0];
  },

  async getAgents(): Promise<Agent[]> {
    const data = await query<{ agents: Omit<Agent, 'user_id'>[] }>('getAgents', `query GetAgents { agents(order_by: {last_name: asc}) { ${AGENT_FIELDS} } }`);
    return data.agents.map((agent) => ({ ...agent, user_id: null }));
  },

  async getLeads(): Promise<Lead[]> {
    const data = await query<{ leads: Lead[] }>('getLeads', `query GetLeads { leads(order_by: {created_at: desc}) { ${LEAD_FIELDS} } }`);
    return data.leads;
  },

  async getLead(id: string): Promise<Lead | null> {
    const data = await query<{ leads: Lead[] }>('getLead', `query GetLead($id: uuid!) { leads(where: {id: {_eq: $id}}, limit: 1) { ${LEAD_FIELDS} } }`, { id });
    return data.leads[0] ?? null;
  },

  async getLeadEvents(leadId: string): Promise<LeadEvent[]> {
    const data = await query<{ lead_events: LeadEvent[] }>('getLeadEvents', `query GetLeadEvents($leadId: uuid!) { lead_events(where: {lead_id: {_eq: $leadId}}, order_by: {created_at: desc}) { id lead_id agency_id event_type description metadata created_at } }`, { leadId });
    return data.lead_events;
  },

  async getAppointments(): Promise<Appointment[]> {
    const data = await query<{ appointments: Appointment[] }>('getAppointments', `query GetAppointments { appointments(order_by: [{date: asc}, {time: asc}]) { ${APPOINTMENT_FIELDS} } }`);
    return data.appointments;
  },

  async getAppointmentsByLead(leadId: string): Promise<Appointment[]> {
    const data = await query<{ appointments: Appointment[] }>('getAppointmentsByLead', `query GetAppointmentsByLead($leadId: uuid!) { appointments(where: {lead_id: {_eq: $leadId}}, order_by: {date: asc}) { ${APPOINTMENT_FIELDS} } }`, { leadId });
    return data.appointments;
  },

  async getCandidates(): Promise<Candidate[]> {
    const data = await query<{ candidates: Omit<Candidate, 'score_breakdown'>[] }>('getCandidates', `query GetCandidates { candidates(order_by: {created_at: desc}) { ${CANDIDATE_FIELDS} } }`);
    return data.candidates.map((candidate) => ({
      ...candidate,
      score_breakdown: { interest: 0, experience: 0, availability: 0, communication: 0, career_intent: 0 },
    }));
  },

  async getCandidate(id: string): Promise<Candidate | null> {
    const data = await query<{ candidates: Omit<Candidate, 'score_breakdown'>[] }>('getCandidate', `query GetCandidate($id: uuid!) { candidates(where: {id: {_eq: $id}}, limit: 1) { ${CANDIDATE_FIELDS} } }`, { id });
    const candidate = data.candidates[0];
    return candidate ? {
      ...candidate,
      score_breakdown: { interest: 0, experience: 0, availability: 0, communication: 0, career_intent: 0 },
    } : null;
  },

  async getCandidateEvents(candidateId: string): Promise<CandidateEvent[]> {
    const data = await query<{ candidate_events: CandidateEvent[] }>('getCandidateEvents', `query GetCandidateEvents($candidateId: uuid!) { candidate_events(where: {candidate_id: {_eq: $candidateId}}, order_by: {created_at: desc}) { id candidate_id agency_id event_type description created_at } }`, { candidateId });
    return data.candidate_events;
  },

  async getCampaigns(): Promise<Campaign[]> {
    const data = await query<{ campaigns: Campaign[] }>('getCampaigns', `query GetCampaigns { campaigns(order_by: {created_at: desc}) { ${CAMPAIGN_FIELDS} } }`);
    return data.campaigns;
  },

  async getContentAssets(): Promise<ContentAsset[]> {
    const data = await query<{ content_assets: ContentAsset[] }>('getContentAssets', `query GetContentAssets { content_assets(order_by: {created_at: desc}) { ${CONTENT_FIELDS} } }`);
    return data.content_assets;
  },

  async getAuditLogs(): Promise<AuditLog[]> {
    const data = await query<{ audit_logs: Omit<AuditLog, 'user_id'>[] }>('getAuditLogs', 'query GetAuditLogs { audit_logs(order_by: {created_at: desc}) { id agency_id action entity_type entity_id metadata created_at } }');
    return data.audit_logs.map((log) => ({ ...log, user_id: null }));
  },

  async createLead(_data: CreateLeadInput): Promise<Lead> { return writeDisabled('createLead'); },
  async updateLead(id: string, updates: UpdateLeadInput): Promise<Lead | null> {
    assertUpdateShape('updateLead', updates as Record<string, unknown>, ['status', 'notes']);
    assertEnumValue('updateLead', updates.status, LEAD_STATUSES);
    if (updates.notes !== undefined && updates.notes !== null && (typeof updates.notes !== 'string' || updates.notes.length > 10_000)) {
      throw new RepositoryError('updateLead', 'NHOST_UPDATE_CONTRACT_REJECTED: updateLead received invalid notes.');
    }
    const set = {
      ...(updates.status !== undefined ? { status: updates.status } : {}),
      ...(updates.notes !== undefined ? { notes: updates.notes } : {}),
    };
    const data = await query<{ update_leads: { affected_rows: number; returning: Lead[] } }>(
      'updateLead',
      `mutation UpdateLead($id: uuid!, $set: leads_set_input!) {
        update_leads(where: {id: {_eq: $id}}, _set: $set) {
          affected_rows
          returning { ${LEAD_FIELDS} }
        }
      }`,
      { id, set },
    );
    return data.update_leads.affected_rows === 1 ? data.update_leads.returning[0] : null;
  },
  async createAppointment(_data: CreateAppointmentInput): Promise<Appointment> { return writeDisabled('createAppointment'); },
  async updateAppointment(id: string, updates: UpdateAppointmentInput): Promise<Appointment | null> {
    assertUpdateShape('updateAppointment', updates as Record<string, unknown>, ['status', 'notes']);
    assertEnumValue('updateAppointment', updates.status, APPOINTMENT_STATUSES);
    if (updates.notes !== undefined && updates.notes !== null && (typeof updates.notes !== 'string' || updates.notes.length > 10_000)) {
      throw new RepositoryError('updateAppointment', 'NHOST_UPDATE_CONTRACT_REJECTED: updateAppointment received invalid notes.');
    }
    const set = {
      ...(updates.status !== undefined ? { status: updates.status } : {}),
      ...(updates.notes !== undefined ? { notes: updates.notes } : {}),
    };
    const data = await query<{ update_appointments: { affected_rows: number; returning: Appointment[] } }>(
      'updateAppointment',
      `mutation UpdateAppointment($id: uuid!, $set: appointments_set_input!) {
        update_appointments(where: {id: {_eq: $id}}, _set: $set) {
          affected_rows
          returning { ${APPOINTMENT_FIELDS} }
        }
      }`,
      { id, set },
    );
    return data.update_appointments.affected_rows === 1 ? data.update_appointments.returning[0] : null;
  },
  async createCandidate(_data: CreateCandidateInput): Promise<Candidate> { return writeDisabled('createCandidate'); },
  async updateCandidate(id: string, updates: UpdateCandidateInput): Promise<Candidate | null> {
    assertUpdateShape('updateCandidate', updates as Record<string, unknown>, ['status']);
    assertEnumValue('updateCandidate', updates.status, CANDIDATE_STATUSES);
    const data = await query<{ update_candidates: { affected_rows: number; returning: Omit<Candidate, 'score_breakdown'>[] } }>(
      'updateCandidate',
      `mutation UpdateCandidate($id: uuid!, $set: candidates_set_input!) {
        update_candidates(where: {id: {_eq: $id}}, _set: $set) {
          affected_rows
          returning { ${CANDIDATE_FIELDS} }
        }
      }`,
      { id, set: { status: updates.status } },
    );
    const candidate = data.update_candidates.affected_rows === 1 ? data.update_candidates.returning[0] : null;
    return candidate ? {
      ...candidate,
      score_breakdown: { interest: 0, experience: 0, availability: 0, communication: 0, career_intent: 0 },
    } : null;
  },
  async updateContentStatus(_id: string, _status: ContentStatus): Promise<ContentAsset | null> { return writeDisabled('updateContentStatus'); },
  async createContentAsset(_data: CreateContentAssetInput): Promise<ContentAsset> { return writeDisabled('createContentAsset'); },

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const [leads, appointments, candidates, agents, campaigns] = await Promise.all([
      this.getLeads(), this.getAppointments(), this.getCandidates(), this.getAgents(), this.getCampaigns(),
    ]);
    const qualifiedLeads = leads.filter((lead) => ['qualified', 'appointment', 'client'].includes(lead.status)).length;
    const campaignSpend = campaigns.reduce((sum, campaign) => sum + Number(campaign.budget ?? 0), 0);
    const clientLeads = leads.filter((lead) => lead.status === 'client').length;
    return {
      total_leads: leads.length,
      qualified_leads: qualifiedLeads,
      appointments: appointments.filter((appointment) => ['scheduled', 'confirmed', 'completed'].includes(appointment.status)).length,
      conversion_rate: leads.length ? Math.round((leads.filter((lead) => ['appointment', 'client'].includes(lead.status)).length / leads.length) * 100) : 0,
      recruiting_candidates: candidates.filter((candidate) => candidate.status !== 'declined').length,
      active_agents: agents.filter((agent) => agent.status === 'active').length,
      campaign_roi: campaignSpend > 0 ? Math.round((clientLeads * 1000 / campaignSpend) * 100) / 100 : 0,
    };
  },
};
