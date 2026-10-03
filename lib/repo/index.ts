import { demoRepository } from './demo';
import { supabaseRepository } from './supabase';
import { nhostRepository } from './nhost';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { isNhostConfigured } from '@/lib/nhost/client';
import type {
  Agency,
  Agent,
  Lead,
  Appointment,
  Candidate,
  Campaign,
  ContentAsset,
  ContentStatus,
  AuditLog,
  LeadEvent,
  CandidateEvent,
  DashboardMetrics,
} from '@/lib/types';
import type {
  CreateAppointmentInput,
  CreateCandidateInput,
  CreateContentAssetInput,
  CreateLeadInput,
  UpdateAppointmentInput,
  UpdateCandidateInput,
  UpdateLeadInput,
} from './types';

export * from './types';

// Unified repository interface — demo and Supabase implementations share this contract.
// The app calls `repo` everywhere; the active implementation is chosen here.
// When Supabase is fully connected with auth, swap to the Supabase repository.

export interface IRepository {
  readonly isDemo: boolean;
  /** Tenant branding source — see the TODO in ./types about wiring this to the UI. */
  getAgency(): Promise<Agency>;
  getAgents(): Promise<Agent[]>;
  getLeads(): Promise<Lead[]>;
  getLead(id: string): Promise<Lead | null>;
  getLeadEvents(leadId: string): Promise<LeadEvent[]>;
  getAppointments(): Promise<Appointment[]>;
  getAppointmentsByLead(leadId: string): Promise<Appointment[]>;
  getCandidates(): Promise<Candidate[]>;
  getCandidate(id: string): Promise<Candidate | null>;
  getCandidateEvents(candidateId: string): Promise<CandidateEvent[]>;
  getCampaigns(): Promise<Campaign[]>;
  getContentAssets(): Promise<ContentAsset[]>;
  getAuditLogs(): Promise<AuditLog[]>;
  createLead(data: CreateLeadInput): Promise<Lead>;
  updateLead(id: string, updates: UpdateLeadInput): Promise<Lead | null>;
  createAppointment(data: CreateAppointmentInput): Promise<Appointment>;
  updateAppointment(id: string, updates: UpdateAppointmentInput): Promise<Appointment | null>;
  createCandidate(data: CreateCandidateInput): Promise<Candidate>;
  updateCandidate(id: string, updates: UpdateCandidateInput): Promise<Candidate | null>;
  updateContentStatus(id: string, status: ContentStatus): Promise<ContentAsset | null>;
  createContentAsset(data: CreateContentAssetInput): Promise<ContentAsset>;
  getDashboardMetrics(): Promise<DashboardMetrics>;
}

// Currently using demo repository — Supabase schema and RLS are defined in migrations
// and can be activated by switching to the Supabase repository implementation.
const requestedDataMode = process.env.NEXT_PUBLIC_DATA_MODE ?? 'demo';
export type DataMode = 'demo' | 'supabase' | 'nhost';
export const dataMode: DataMode = ['demo', 'supabase', 'nhost'].includes(requestedDataMode)
  ? requestedDataMode as DataMode
  : 'demo';
export const isDemoMode = dataMode === 'demo';
export const isNhostMode = dataMode === 'nhost';

if (dataMode === 'supabase' && !isSupabaseConfigured) {
  throw new Error('NEXT_PUBLIC_DATA_MODE=supabase requires Supabase URL and anon key.');
}

if (dataMode === 'nhost' && !isNhostConfigured) {
  throw new Error('NEXT_PUBLIC_DATA_MODE=nhost requires Nhost subdomain and region.');
}

export const repo: IRepository = dataMode === 'nhost'
  ? nhostRepository
  : dataMode === 'supabase'
    ? supabaseRepository
    : demoRepository;
