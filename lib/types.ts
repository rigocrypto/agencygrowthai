// Domain types for AgencyGrowthAI — shared across demo and Supabase implementations

export type AgencyRole = 'agency_owner' | 'agency_admin' | 'agent' | 'marketing_manager';

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'appointment' | 'client' | 'nurture' | 'lost';
export type LeadScoreTier = 'low' | 'moderate' | 'high' | 'priority';
export type AppointmentStatus =
  | 'requested'
  | 'scheduled'
  | 'confirmed'
  | 'completed'
  | 'no_show'
  | 'cancelled'
  | 'follow_up_required';
export type CandidateStatus =
  | 'new'
  | 'contacted'
  | 'discovery_call'
  | 'licensing'
  | 'licensed'
  | 'onboarded'
  | 'nurture'
  | 'declined';
export type ContentStatus = 'draft' | 'pending_review' | 'approved' | 'published' | 'rejected' | 'archived';
export type CampaignPlatform =
  | 'facebook'
  | 'instagram'
  | 'linkedin'
  | 'google'
  | 'tiktok'
  | 'youtube'
  | 'organic'
  | 'referral'
  | 'direct';

export interface Agency {
  id: string;
  name: string;
  domain: string | null;
  primary_color: string;
  secondary_color: string;
  contact_email: string;
  contact_phone: string;
  default_calendar_url: string | null;
  compliance_disclaimer: string;
  privacy_policy_url: string | null;
  terms_url: string | null;
  career_disclaimer: string;
  financial_education_disclaimer: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  agency_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: AgencyRole;
  avatar_url: string | null;
  created_at: string;
}

export interface Agent {
  id: string;
  agency_id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: AgencyRole;
  status: 'active' | 'inactive';
  license_status: 'licensed' | 'pending' | 'unlicensed';
  bio: string | null;
  created_at: string;
}

export interface Lead {
  id: string;
  agency_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  source: string;
  campaign_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  status: LeadStatus;
  score: number;
  score_tier: LeadScoreTier;
  interest: string | null;
  assigned_agent_id: string | null;
  consent: boolean;
  consent_method: string | null;
  preferred_contact: string | null;
  checkup_responses: CheckupResponses | null;
  ai_summary: string | null;
  notes: string | null;
  last_activity: string;
  created_at: string;
}

export interface CheckupResponses {
  age_range: string;
  employment_status: string;
  household_income_range: string;
  dependents: string;
  retirement_savings_range: string;
  emergency_savings_range: string;
  life_insurance_status: string;
  primary_goal: string;
  preferred_contact_method: string;
  consent_to_contact: boolean;
}

export interface FinancialHealthSnapshot {
  retirement_preparedness: { score: number; label: string; description: string };
  emergency_savings: { score: number; label: string; description: string };
  family_protection: { score: number; label: string; description: string };
  financial_education: { score: number; label: string; description: string };
  long_term_planning: { score: number; label: string; description: string };
  overall: { score: number; label: string };
  summary: string;
}

export interface LeadEvent {
  id: string;
  lead_id: string;
  agency_id: string;
  event_type: string;
  description: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Appointment {
  id: string;
  agency_id: string;
  lead_id: string;
  agent_id: string | null;
  date: string;
  time: string;
  meeting_type: string;
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Candidate {
  id: string;
  agency_id: string;
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
  status: CandidateStatus;
  score: number;
  score_breakdown: {
    interest: number;
    experience: number;
    availability: number;
    communication: number;
    career_intent: number;
  };
  assigned_agent_id: string | null;
  created_at: string;
}

export interface CandidateEvent {
  id: string;
  candidate_id: string;
  agency_id: string;
  event_type: string;
  description: string;
  created_at: string;
}

export interface Campaign {
  id: string;
  agency_id: string;
  name: string;
  platform: CampaignPlatform;
  campaign_type: string;
  landing_page: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  budget: number | null;
  status: 'active' | 'paused' | 'completed';
  created_at: string;
}

export interface ContentAsset {
  id: string;
  agency_id: string;
  title: string;
  type: 'social_post' | 'email' | 'landing_page' | 'educational_article' | 'ad_copy';
  content: string;
  status: ContentStatus;
  created_by: string;
  reviewer: string | null;
  approval_date: string | null;
  version: number;
  ai_generated: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  agency_id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface DashboardMetrics {
  total_leads: number;
  qualified_leads: number;
  appointments: number;
  conversion_rate: number;
  recruiting_candidates: number;
  active_agents: number;
  campaign_roi: number;
}
