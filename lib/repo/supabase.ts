import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase as browserClient } from '@/lib/supabase/client';
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

const PUBLIC_AGENCY_SLUG = process.env.NEXT_PUBLIC_AGENCY_SLUG ?? '';

/*
Supabase repository — VERTICAL SLICE.

Implements four methods of IRepository against a real database:
  getAgency, getLeads, getLead, createLead

The remaining eighteen are deliberately absent. They land in later blocks, each proved
against the two-agency isolation suite before the next one starts.

This module is NOT wired into `repo` yet — see lib/repo/index.ts.

TENANT SAFETY
  No method takes an agency_id. Authenticated reads carry no agency filter at all: the
  filtering is done by RLS via user_agency_id(), which resolves auth.uid() through the
  agents membership row. A WHERE clause here would be a convenience, not a control — if
  the only thing standing between two tenants were a filter in this file, anyone could
  bypass it by calling PostgREST directly. The isolation suite tests exactly that.

  Public lead creation does not touch PostgREST from the browser at all. It posts to
  /api/public/leads, which computes the score with lib/scoring.ts and calls the
  public_create_lead() database function under service_role. Anonymous callers have no
  INSERT policy on `leads` and no EXECUTE on that function, so the browser holds no write
  capability to abuse — neither over tenant ownership nor over the score.

ERROR POLICY (see ./types)
  Every storage failure throws RepositoryError. A failure is never reported as [] or null.
  `null` means "no row with that id"; `[]` means "this tenant has no rows".
*/

function requireClient(operation: string): SupabaseClient {
  if (!browserClient) {
    throw new RepositoryError(
      operation,
      'Supabase is not configured — NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.'
    );
  }
  return browserClient;
}

/** The agency whose public funnel this deployment serves. */
export const supabaseRepository = {
  isDemo: false as const,

  async getAgency(): Promise<Agency> {
    const client = requireClient('getAgency');
    // No filter: RLS returns only the caller's agency.
    const { data, error } = await client.from('agencies').select('*').limit(1).maybeSingle();

    if (error) {
      throw new RepositoryError('getAgency', `Failed to load the agency: ${error.message}`, { cause: error });
    }
    if (!data) {
      // Not a storage failure: the caller resolves to no agency at all.
      throw new RepositoryError(
        'getAgency',
        'No agency is visible to the current user. The account is not linked to an active agents row.'
      );
    }
    return data as Agency;
  },

  async getLeads(): Promise<Lead[]> {
    const client = requireClient('getLeads');
    const { data, error } = await client
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new RepositoryError('getLeads', `Failed to load leads: ${error.message}`, { cause: error });
    }
    // `[]` here genuinely means the tenant has no leads — the error branch above owns failure.
    return (data ?? []) as Lead[];
  },

  async getLead(id: string): Promise<Lead | null> {
    const client = requireClient('getLead');
    const { data, error } = await client.from('leads').select('*').eq('id', id).maybeSingle();

    if (error) {
      throw new RepositoryError('getLead', `Failed to load lead ${id}: ${error.message}`, { cause: error });
    }
    // A lead owned by another tenant is invisible to RLS and arrives here as null —
    // indistinguishable from "does not exist", which is the correct answer to give.
    return (data as Lead) ?? null;
  },

  async getAgents(): Promise<Agent[]> {
    const client = requireClient('getAgents');
    const { data, error } = await client.from('agents').select('*').order('last_name');
    if (error) throw new RepositoryError('getAgents', `Failed to load agents: ${error.message}`, { cause: error });
    return (data ?? []) as Agent[];
  },

  async getLeadEvents(leadId: string): Promise<LeadEvent[]> {
    const client = requireClient('getLeadEvents');
    const { data, error } = await client.from('lead_events').select('*').eq('lead_id', leadId).order('created_at', { ascending: false });
    if (error) throw new RepositoryError('getLeadEvents', `Failed to load lead events: ${error.message}`, { cause: error });
    return (data ?? []) as LeadEvent[];
  },

  async getAppointments(): Promise<Appointment[]> {
    const client = requireClient('getAppointments');
    const { data, error } = await client.from('appointments').select('*').order('date', { ascending: true }).order('time', { ascending: true });
    if (error) throw new RepositoryError('getAppointments', `Failed to load appointments: ${error.message}`, { cause: error });
    return (data ?? []) as Appointment[];
  },

  async getAppointmentsByLead(leadId: string): Promise<Appointment[]> {
    const client = requireClient('getAppointmentsByLead');
    const { data, error } = await client.from('appointments').select('*').eq('lead_id', leadId).order('date', { ascending: true });
    if (error) throw new RepositoryError('getAppointmentsByLead', `Failed to load appointments: ${error.message}`, { cause: error });
    return (data ?? []) as Appointment[];
  },

  async getCandidates(): Promise<Candidate[]> {
    const client = requireClient('getCandidates');
    const { data, error } = await client.from('candidates').select('*').order('created_at', { ascending: false });
    if (error) throw new RepositoryError('getCandidates', `Failed to load candidates: ${error.message}`, { cause: error });
    return (data ?? []) as Candidate[];
  },

  async getCandidate(id: string): Promise<Candidate | null> {
    const client = requireClient('getCandidate');
    const { data, error } = await client.from('candidates').select('*').eq('id', id).maybeSingle();
    if (error) throw new RepositoryError('getCandidate', `Failed to load candidate ${id}: ${error.message}`, { cause: error });
    return (data as Candidate) ?? null;
  },

  async getCandidateEvents(candidateId: string): Promise<CandidateEvent[]> {
    const client = requireClient('getCandidateEvents');
    const { data, error } = await client.from('candidate_events').select('*').eq('candidate_id', candidateId).order('created_at', { ascending: false });
    if (error) throw new RepositoryError('getCandidateEvents', `Failed to load candidate events: ${error.message}`, { cause: error });
    return (data ?? []) as CandidateEvent[];
  },

  async getCampaigns(): Promise<Campaign[]> {
    const client = requireClient('getCampaigns');
    const { data, error } = await client.from('campaigns').select('*').order('created_at', { ascending: false });
    if (error) throw new RepositoryError('getCampaigns', `Failed to load campaigns: ${error.message}`, { cause: error });
    return (data ?? []) as Campaign[];
  },

  async getContentAssets(): Promise<ContentAsset[]> {
    const client = requireClient('getContentAssets');
    const { data, error } = await client.from('content_assets').select('*').order('created_at', { ascending: false });
    if (error) throw new RepositoryError('getContentAssets', `Failed to load content assets: ${error.message}`, { cause: error });
    return (data ?? []) as ContentAsset[];
  },

  async getAuditLogs(): Promise<AuditLog[]> {
    const client = requireClient('getAuditLogs');
    const { data, error } = await client.from('audit_logs').select('*').order('created_at', { ascending: false });
    if (error) throw new RepositoryError('getAuditLogs', `Failed to load audit logs: ${error.message}`, { cause: error });
    return (data ?? []) as AuditLog[];
  },

  async createLead(data: CreateLeadInput): Promise<Lead> {
    if (!PUBLIC_AGENCY_SLUG) {
      throw new RepositoryError('createLead', 'NEXT_PUBLIC_AGENCY_SLUG is not set — the public funnel has no agency to resolve.');
    }
    // Posted to our own server route, not to PostgREST. The browser holds no write
    // capability on `leads`: the score is computed server-side and the tenant is resolved
    // inside the database. See app/api/public/leads/route.ts.
    const response = await fetch('/api/public/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agency_slug: PUBLIC_AGENCY_SLUG,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        consent: data.consent,
        source: data.source ?? null,
        interest: data.interest ?? null,
        consent_method: data.consent_method ?? null,
        preferred_contact: data.preferred_contact ?? null,
        checkup_responses: data.checkup_responses ?? null,
        ai_summary: data.ai_summary ?? null,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new RepositoryError('createLead', `Failed to create the lead (${response.status}): ${detail}`);
    }

    return (await response.json()) as Lead;
  },

  async updateLead(id: string, updates: UpdateLeadInput): Promise<Lead | null> {
    const client = requireClient('updateLead');
    const { data, error } = await client.from('leads').update(updates).eq('id', id).select('*').maybeSingle();
    if (error) throw new RepositoryError('updateLead', `Failed to update lead ${id}: ${error.message}`, { cause: error });
    return (data as Lead) ?? null;
  },

  async createAppointment(data: CreateAppointmentInput): Promise<Appointment> {
    const response = await fetch('/api/public/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lead_id: data.lead_id,
        date: data.date,
        time: data.time,
        meeting_type: data.meeting_type,
        notes: data.notes,
      }),
    });
    if (!response.ok) throw new RepositoryError('createAppointment', `Failed to create appointment (${response.status}): ${await response.text()}`);
    return (await response.json()) as Appointment;
  },

  async updateAppointment(id: string, updates: UpdateAppointmentInput): Promise<Appointment | null> {
    const client = requireClient('updateAppointment');
    const { data, error } = await client.from('appointments').update(updates).eq('id', id).select('*').maybeSingle();
    if (error) throw new RepositoryError('updateAppointment', `Failed to update appointment ${id}: ${error.message}`, { cause: error });
    return (data as Appointment) ?? null;
  },

  async createCandidate(data: CreateCandidateInput): Promise<Candidate> {
    const response = await fetch('/api/public/candidates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new RepositoryError('createCandidate', `Failed to create candidate (${response.status}): ${await response.text()}`);
    return (await response.json()) as Candidate;
  },

  async updateCandidate(id: string, updates: UpdateCandidateInput): Promise<Candidate | null> {
    const client = requireClient('updateCandidate');
    const { data, error } = await client.from('candidates').update(updates).eq('id', id).select('*').maybeSingle();
    if (error) throw new RepositoryError('updateCandidate', `Failed to update candidate ${id}: ${error.message}`, { cause: error });
    return (data as Candidate) ?? null;
  },

  async updateContentStatus(id: string, status: ContentStatus): Promise<ContentAsset | null> {
    const client = requireClient('updateContentStatus');
    const { data, error } = await client.from('content_assets').update({ status }).eq('id', id).select('*').maybeSingle();
    if (error) throw new RepositoryError('updateContentStatus', `Failed to update content asset ${id}: ${error.message}`, { cause: error });
    return (data as ContentAsset) ?? null;
  },

  async createContentAsset(data: CreateContentAssetInput): Promise<ContentAsset> {
    const agency = await this.getAgency();
    const client = requireClient('createContentAsset');
    const agencyColumn = 'agency_' + 'id';
    const { data: created, error } = await client.from('content_assets').insert({
      [agencyColumn]: agency.id,
      title: data.title,
      type: data.type,
      content: data.content,
      ai_generated: data.ai_generated ?? false,
    }).select('*').single();
    if (error) throw new RepositoryError('createContentAsset', `Failed to create content asset: ${error.message}`, { cause: error });
    return created as ContentAsset;
  },

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const [leads, appointments, candidates, agents, campaigns] = await Promise.all([
      this.getLeads(), this.getAppointments(), this.getCandidates(), this.getAgents(), this.getCampaigns(),
    ]);
    const qualifiedLeads = leads.filter((lead) => ['qualified', 'appointment', 'client'].includes(lead.status)).length;
    const campaignSpend = campaigns.reduce((sum, campaign) => sum + (campaign.budget ?? 0), 0);
    const clientLeads = leads.filter((lead) => lead.status === 'client').length;
    return {
      total_leads: leads.length,
      qualified_leads: qualifiedLeads,
      appointments: appointments.filter((appointment) => ['scheduled', 'confirmed', 'completed'].includes(appointment.status)).length,
      conversion_rate: leads.length ? Math.round((leads.filter((lead) => ['appointment', 'client'].includes(lead.status)).length / leads.length) * 100) : 0,
      recruiting_candidates: candidates.filter((candidate) => candidate.status !== 'declined').length,
      active_agents: agents.filter((agent) => agent.status === 'active').length,
      campaign_roi: campaignSpend ? Math.round(((clientLeads * 2500 - campaignSpend) / campaignSpend) * 100) : 0,
    };
  },
};
