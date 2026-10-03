import type { ContentStatus } from '@/lib/types';

// Central agency/tenant configuration — used across all UI and flows

export const AGENCY_CONFIG = {
  name: 'Horizon Financial Group',
  domain: 'horizonfinancial.example',
  primary_color: '#0f766e',
  secondary_color: '#0c4a6e',
  contact_email: 'hello@horizonfinancial.example',
  contact_phone: '(555) 100-2000',
  default_calendar_url: null as string | null,
  compliance_disclaimer:
    'Compliance workflows are organizational controls and do not replace applicable laws, regulations, carrier/broker-dealer requirements, or professional review.',
  privacy_policy_url: '/privacy',
  terms_url: '/terms',
  career_disclaimer:
    'This is an independent-contractor opportunity, not an offer of employment. Earnings depend on individual effort, market conditions, and applicable licensing. No income is guaranteed.',
  financial_education_disclaimer:
    'The information provided is educational only and is not individualized financial, investment, tax, or legal advice. It does not constitute a recommendation to purchase any specific insurance, investment, or annuity product.',
  ai_generated_label: 'AI-generated draft — requires human/compliance review before publication.',
  is_demo: true,
} as const;

export const LEAD_SCORE_TIERS = {
  low: { min: 0, max: 39, label: 'Low Intent', color: 'text-slate-500', bg: 'bg-slate-100' },
  moderate: { min: 40, max: 69, label: 'Moderate Intent', color: 'text-blue-600', bg: 'bg-blue-100' },
  high: { min: 70, max: 84, label: 'High Intent', color: 'text-amber-600', bg: 'bg-amber-100' },
  priority: { min: 85, max: 100, label: 'Priority', color: 'text-emerald-700', bg: 'bg-emerald-100' },
} as const;

export const LEAD_STATUSES: { value: string; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'appointment', label: 'Appointment' },
  { value: 'client', label: 'Client' },
  { value: 'nurture', label: 'Nurture' },
  { value: 'lost', label: 'Lost' },
];

export const APPOINTMENT_STATUSES: { value: string; label: string }[] = [
  { value: 'requested', label: 'Requested' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'no_show', label: 'No-show' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'follow_up_required', label: 'Follow-up Required' },
];

export const CANDIDATE_STATUSES: { value: string; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'discovery_call', label: 'Discovery Call' },
  { value: 'licensing', label: 'Licensing' },
  { value: 'licensed', label: 'Licensed' },
  { value: 'onboarded', label: 'Onboarded' },
  { value: 'nurture', label: 'Nurture' },
  { value: 'declined', label: 'Declined' },
];

export const CONTENT_STATUSES: { value: ContentStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'published', label: 'Published' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'archived', label: 'Archived' },
];

export const CAMPAIGN_PLATFORMS: { value: string; label: string }[] = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'google', label: 'Google' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'organic', label: 'Organic' },
  { value: 'referral', label: 'Referral' },
  { value: 'direct', label: 'Direct' },
];

export const ROLES: { value: string; label: string }[] = [
  { value: 'agency_owner', label: 'Agency Owner' },
  { value: 'agency_admin', label: 'Agency Admin' },
  { value: 'agent', label: 'Agent' },
  { value: 'marketing_manager', label: 'Marketing Manager' },
];

export function scoreTier(score: number): keyof typeof LEAD_SCORE_TIERS {
  if (score >= 85) return 'priority';
  if (score >= 70) return 'high';
  if (score >= 40) return 'moderate';
  return 'low';
}
