import type {
  Agency,
  Agent,
  Lead,
  Appointment,
  Candidate,
  Campaign,
  ContentAsset,
  AuditLog,
  LeadEvent,
  CandidateEvent,
  DashboardMetrics,
  CheckupResponses,
  ContentStatus,
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
import { scoreTier } from '@/lib/constants';
import { scoreCandidate, scoreLead } from '@/lib/scoring';

// DEMO DATA — All people and activity are fictional.
// This repository provides the same interfaces as the Supabase implementation.
// When Supabase is connected, the app switches to live data without UI changes.

const DEMO_AGENCY_ID = 'a0000000-0000-0000-0000-000000000001';

// Stands in for the acting user until content authoring is bound to a real session.
const DEMO_AUTHOR_AGENT_ID = 'ag-005';

const demoAgency: Agency = {
  id: DEMO_AGENCY_ID,
  name: 'Horizon Financial Group',
  domain: 'horizonfinancial.example',
  primary_color: '#0f766e',
  secondary_color: '#0c4a6e',
  contact_email: 'hello@horizonfinancial.example',
  contact_phone: '(555) 100-2000',
  default_calendar_url: null,
  compliance_disclaimer:
    'Compliance workflows are organizational controls and do not replace applicable laws, regulations, carrier/broker-dealer requirements, or professional review.',
  privacy_policy_url: '/privacy',
  terms_url: '/terms',
  career_disclaimer:
    'This is an independent-contractor opportunity, not an offer of employment. Earnings depend on individual effort, market conditions, and applicable licensing. No income is guaranteed.',
  financial_education_disclaimer:
    'The information provided is educational only and is not individualized financial, investment, tax, or legal advice.',
  created_at: '2025-01-15T10:00:00Z',
  updated_at: '2025-08-14T10:00:00Z',
};

const demoAgents: Agent[] = [
  { id: 'ag-001', agency_id: DEMO_AGENCY_ID, user_id: null, first_name: 'Sarah', last_name: 'Mitchell', email: 'sarah.m@horizonfinancial.example', phone: '(555) 200-1001', role: 'agency_owner', status: 'active', license_status: 'licensed', bio: 'Founder and principal advisor with 15 years of experience.', created_at: '2025-01-15T10:00:00Z' },
  { id: 'ag-002', agency_id: DEMO_AGENCY_ID, user_id: null, first_name: 'James', last_name: 'Carter', email: 'james.c@horizonfinancial.example', phone: '(555) 200-1002', role: 'agency_admin', status: 'active', license_status: 'licensed', bio: 'Operations lead and compliance coordinator.', created_at: '2025-01-20T10:00:00Z' },
  { id: 'ag-003', agency_id: DEMO_AGENCY_ID, user_id: null, first_name: 'Maria', last_name: 'Rodriguez', email: 'maria.r@horizonfinancial.example', phone: '(555) 200-1003', role: 'agent', status: 'active', license_status: 'licensed', bio: 'Senior agent specializing in family protection planning.', created_at: '2025-02-01T10:00:00Z' },
  { id: 'ag-004', agency_id: DEMO_AGENCY_ID, user_id: null, first_name: 'David', last_name: 'Thompson', email: 'david.t@horizonfinancial.example', phone: '(555) 200-1004', role: 'agent', status: 'active', license_status: 'licensed', bio: 'Retirement planning specialist.', created_at: '2025-02-15T10:00:00Z' },
  { id: 'ag-005', agency_id: DEMO_AGENCY_ID, user_id: null, first_name: 'Lisa', last_name: 'Chen', email: 'lisa.c@horizonfinancial.example', phone: '(555) 200-1005', role: 'marketing_manager', status: 'active', license_status: 'unlicensed', bio: 'Marketing manager handling digital campaigns and content.', created_at: '2025-03-01T10:00:00Z' },
];

const demoCampaigns: Campaign[] = [
  { id: 'cmp-001', agency_id: DEMO_AGENCY_ID, name: 'Spring Retirement Readiness', platform: 'facebook', campaign_type: 'lead_gen', landing_page: '/financial-checkup', utm_source: 'facebook', utm_medium: 'paid_social', utm_campaign: 'spring_retirement', budget: 2500, status: 'active', created_at: '2025-03-01T10:00:00Z' },
  { id: 'cmp-002', agency_id: DEMO_AGENCY_ID, name: 'Family Protection Webinar', platform: 'instagram', campaign_type: 'webinar', landing_page: '/financial-checkup', utm_source: 'instagram', utm_medium: 'paid_social', utm_campaign: 'family_protection', budget: 1800, status: 'active', created_at: '2025-04-01T10:00:00Z' },
  { id: 'cmp-003', agency_id: DEMO_AGENCY_ID, name: 'Career Opportunity Q3', platform: 'linkedin', campaign_type: 'recruiting', landing_page: '/career', utm_source: 'linkedin', utm_medium: 'paid_social', utm_campaign: 'career_q3', budget: 1200, status: 'active', created_at: '2025-06-01T10:00:00Z' },
  { id: 'cmp-004', agency_id: DEMO_AGENCY_ID, name: 'Financial Education Series', platform: 'google', campaign_type: 'content', landing_page: '/financial-checkup', utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'edu_series', budget: 3000, status: 'active', created_at: '2025-05-15T10:00:00Z' },
];

function makeCheckup(i: number): CheckupResponses {
  const ageRanges = ['25-34', '35-44', '45-54', '55-64'];
  const incomeRanges = ['50k-75k', '75k-100k', '100k-150k', '150k+'];
  const retireRanges = ['none', 'under_25k', '25k-100k', '100k-500k'];
  const emergRanges = ['none', 'under_3_months', '3-6_months', '6+_months'];
  const lifeIns = ['none', 'unsure', 'employer_only', 'individual_policy'];
  const dependents = ['0', '1', '2', '3_or_more'];
  const goals = ['retirement_planning', 'family_protection', 'wealth_building', 'debt_management'];
  const contacts = ['phone', 'email', 'text', 'video'];
  const employment = ['full_time', 'part_time', 'self_employed', 'retired'];

  return {
    age_range: ageRanges[i % ageRanges.length],
    employment_status: employment[i % employment.length],
    household_income_range: incomeRanges[i % incomeRanges.length],
    dependents: dependents[i % dependents.length],
    retirement_savings_range: retireRanges[i % retireRanges.length],
    emergency_savings_range: emergRanges[i % emergRanges.length],
    life_insurance_status: lifeIns[i % lifeIns.length],
    primary_goal: goals[i % goals.length],
    preferred_contact_method: contacts[i % contacts.length],
    consent_to_contact: true,
  };
}

const firstNames = ['Michael', 'Jennifer', 'Robert', 'Emily', 'William', 'Jessica', 'Thomas', 'Amanda', 'Christopher', 'Nicole', 'Daniel', 'Stephanie', 'Matthew', 'Rachel', 'Anthony', 'Samantha', 'Mark', 'Elizabeth', 'Steven', 'Hannah', 'Brian', 'Victoria', 'Kevin', 'Olivia', 'Jason', 'Madison', 'Eric', 'Sophia', 'Andrew', 'Isabella', 'Joshua', 'Charlotte', 'Ryan', 'Amelia', 'Jacob', 'Mia', 'Gary', 'Avery', 'Nicholas', 'Ella'];
const lastNames = ['Anderson', 'Bennett', 'Collins', 'Davis', 'Edwards', 'Foster', 'Garcia', 'Harris', 'Iverson', 'Johnson', 'Kennedy', 'Lopez', 'Martinez', 'Nelson', 'Owens', 'Patel', 'Quinn', 'Robinson', 'Stewart', 'Taylor', 'Underwood', 'Vargas', 'Williams', 'Xu', 'Young', 'Zimmerman', 'Brooks', 'Coleman', 'Diaz', 'Ellis'];
const sources = ['facebook', 'instagram', 'google', 'linkedin', 'organic', 'referral', 'direct'];
const statuses = ['new', 'contacted', 'qualified', 'appointment', 'client', 'nurture', 'lost'] as const;
const interests = ['Retirement Planning', 'Family Protection', 'Wealth Building', 'Debt Management', 'College Funding', 'Estate Planning'];

function generateLeads(): Lead[] {
  const leads: Lead[] = [];
  for (let i = 0; i < 40; i++) {
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[i % lastNames.length];
    const responses = makeCheckup(i);
    // Simplified score for demo data
    const baseScore = ((i * 7) % 80) + 15;
    const score = Math.min(baseScore + (i % 3) * 5, 100);
    const tier = scoreTier(score);
    const status = statuses[i % statuses.length];
    const source = sources[i % sources.length];
    const campaign = demoCampaigns[i % demoCampaigns.length];
    const agent = demoAgents[i % demoAgents.length];
    const daysAgo = 80 - i;
    const created = new Date(Date.now() - daysAgo * 86400000).toISOString();

    leads.push({
      id: `lead-${String(i + 1).padStart(3, '0')}`,
      agency_id: DEMO_AGENCY_ID,
      first_name: fn,
      last_name: ln,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}@example.com`,
      phone: `(555) ${300 + (i % 100)}-${1000 + i}`,
      source,
      campaign_id: campaign.id,
      utm_source: source,
      utm_medium: campaign.utm_medium,
      utm_campaign: campaign.utm_campaign,
      status,
      score,
      score_tier: tier,
      interest: interests[i % interests.length],
      assigned_agent_id: i % 5 === 0 ? null : agent.id,
      consent: true,
      consent_method: 'checkup_form',
      preferred_contact: responses.preferred_contact_method,
      checkup_responses: responses,
      ai_summary: `${fn} ${ln} is a ${responses.age_range} professional interested in ${interests[i % interests.length].toLowerCase()}. Engagement level: ${tier === 'priority' ? 'high' : tier === 'high' ? 'elevated' : 'standard'}.`,
      notes: i % 4 === 0 ? 'Followed up via email. Awaiting response.' : null,
      last_activity: new Date(Date.now() - (daysAgo - 2) * 86400000).toISOString(),
      created_at: created,
    });
  }
  return leads;
}

const demoLeads = generateLeads();

const demoAppointments: Appointment[] = [
  { id: 'apt-001', agency_id: DEMO_AGENCY_ID, lead_id: 'lead-003', agent_id: 'ag-003', date: '2025-08-16', time: '10:00', meeting_type: 'Educational Consultation', status: 'scheduled', notes: 'Initial educational conversation about retirement planning.', created_at: '2025-08-10T10:00:00Z', updated_at: '2025-08-10T10:00:00Z' },
  { id: 'apt-002', agency_id: DEMO_AGENCY_ID, lead_id: 'lead-007', agent_id: 'ag-004', date: '2025-08-17', time: '14:00', meeting_type: 'Educational Consultation', status: 'confirmed', notes: 'Confirmed via phone.', created_at: '2025-08-09T10:00:00Z', updated_at: '2025-08-12T10:00:00Z' },
  { id: 'apt-003', agency_id: DEMO_AGENCY_ID, lead_id: 'lead-010', agent_id: 'ag-003', date: '2025-08-15', time: '11:00', meeting_type: 'Follow-up Call', status: 'completed', notes: 'Good conversation. Client considering options.', created_at: '2025-08-05T10:00:00Z', updated_at: '2025-08-15T12:00:00Z' },
  { id: 'apt-004', agency_id: DEMO_AGENCY_ID, lead_id: 'lead-014', agent_id: 'ag-001', date: '2025-08-20', time: '09:00', meeting_type: 'Educational Consultation', status: 'requested', notes: 'Lead requested appointment via checkup form.', created_at: '2025-08-13T10:00:00Z', updated_at: '2025-08-13T10:00:00Z' },
  { id: 'apt-005', agency_id: DEMO_AGENCY_ID, lead_id: 'lead-021', agent_id: 'ag-004', date: '2025-08-14', time: '15:30', meeting_type: 'Discovery Call', status: 'confirmed', notes: 'Second conversation after initial contact.', created_at: '2025-08-08T10:00:00Z', updated_at: '2025-08-11T10:00:00Z' },
  { id: 'apt-006', agency_id: DEMO_AGENCY_ID, lead_id: 'lead-028', agent_id: 'ag-003', date: '2025-08-12', time: '13:00', meeting_type: 'Educational Consultation', status: 'no_show', notes: 'Did not show. Rescheduling.', created_at: '2025-08-06T10:00:00Z', updated_at: '2025-08-12T14:00:00Z' },
  { id: 'apt-007', agency_id: DEMO_AGENCY_ID, lead_id: 'lead-005', agent_id: 'ag-001', date: '2025-08-22', time: '10:30', meeting_type: 'Educational Consultation', status: 'scheduled', notes: 'Family protection planning discussion.', created_at: '2025-08-11T10:00:00Z', updated_at: '2025-08-11T10:00:00Z' },
  { id: 'apt-008', agency_id: DEMO_AGENCY_ID, lead_id: 'lead-035', agent_id: 'ag-004', date: '2025-08-19', time: '16:00', meeting_type: 'Follow-up Call', status: 'follow_up_required', notes: 'Needs follow-up regarding licensing questions.', created_at: '2025-08-07T10:00:00Z', updated_at: '2025-08-14T09:00:00Z' },
];

const demoCandidates: Candidate[] = [
  { id: 'cand-001', agency_id: DEMO_AGENCY_ID, first_name: 'Alex', last_name: 'Rivera', email: 'alex.rivera@example.com', phone: '(555) 400-1001', state: 'TX', current_occupation: 'Teacher', years_experience: '6-10', why_interested: 'I want to transition into a career where I can help families with financial education while building my own business.', sales_experience: 'some', financial_services_experience: 'none', preferred_contact: 'phone', status: 'discovery_call', score: 62, score_breakdown: { interest: 20, experience: 18, availability: 15, communication: 15, career_intent: 10 }, assigned_agent_id: 'ag-002', created_at: '2025-07-15T10:00:00Z' },
  { id: 'cand-002', agency_id: DEMO_AGENCY_ID, first_name: 'Taylor', last_name: 'Morgan', email: 'taylor.morgan@example.com', phone: '(555) 400-1002', state: 'FL', current_occupation: 'Sales Representative', years_experience: '3-5', why_interested: 'Looking for an entrepreneurial opportunity in financial services with flexible hours.', sales_experience: 'extensive', financial_services_experience: 'some', preferred_contact: 'video', status: 'licensing', score: 78, score_breakdown: { interest: 12, experience: 12, availability: 18, communication: 18, career_intent: 18 }, assigned_agent_id: 'ag-002', created_at: '2025-07-20T10:00:00Z' },
  { id: 'cand-003', agency_id: DEMO_AGENCY_ID, first_name: 'Jordan', last_name: 'Lee', email: 'jordan.lee@example.com', phone: '(555) 400-1003', state: 'CA', current_occupation: 'Accountant', years_experience: '10+', why_interested: 'I have a finance background and want to build an independent practice helping clients with comprehensive planning.', sales_experience: 'some', financial_services_experience: 'extensive', preferred_contact: 'email', status: 'licensed', score: 88, score_breakdown: { interest: 12, experience: 20, availability: 10, communication: 10, career_intent: 18 }, assigned_agent_id: 'ag-001', created_at: '2025-06-10T10:00:00Z' },
  { id: 'cand-004', agency_id: DEMO_AGENCY_ID, first_name: 'Casey', last_name: 'Brooks', email: 'casey.brooks@example.com', phone: '(555) 400-1004', state: 'NY', current_occupation: 'Marketing Coordinator', years_experience: '0-2', why_interested: 'Curious about a career change into financial services.', sales_experience: 'none', financial_services_experience: 'none', preferred_contact: 'email', status: 'new', score: 28, score_breakdown: { interest: 5, experience: 5, availability: 10, communication: 10, career_intent: 5 }, assigned_agent_id: null, created_at: '2025-08-12T10:00:00Z' },
  { id: 'cand-005', agency_id: DEMO_AGENCY_ID, first_name: 'Morgan', last_name: 'Hayes', email: 'morgan.hayes@example.com', phone: '(555) 400-1005', state: 'IL', current_occupation: 'Insurance Agent', years_experience: '6-10', why_interested: 'I am already licensed in life and health and want to expand into a full financial services practice with a supportive agency.', sales_experience: 'extensive', financial_services_experience: 'extensive', preferred_contact: 'phone', status: 'onboarded', score: 92, score_breakdown: { interest: 20, experience: 18, availability: 15, communication: 15, career_intent: 20 }, assigned_agent_id: 'ag-001', created_at: '2025-05-01T10:00:00Z' },
  { id: 'cand-006', agency_id: DEMO_AGENCY_ID, first_name: 'Riley', last_name: 'Parker', email: 'riley.parker@example.com', phone: '(555) 400-1006', state: 'GA', current_occupation: 'Retail Manager', years_experience: '3-5', why_interested: 'Interested in the earning potential and flexibility of an independent financial services career.', sales_experience: 'some', financial_services_experience: 'none', preferred_contact: 'text', status: 'contacted', score: 55, score_breakdown: { interest: 12, experience: 12, availability: 12, communication: 12, career_intent: 12 }, assigned_agent_id: 'ag-002', created_at: '2025-08-05T10:00:00Z' },
];

const demoContentAssets: ContentAsset[] = [
  { id: 'content-001', agency_id: DEMO_AGENCY_ID, title: '5 Retirement Planning Myths — Social Post', type: 'social_post', content: 'Thinking about retirement? Here are 5 common myths that could cost you:\n\n1. "I have plenty of time"\n2. "Social Security will cover everything"\n3. "I can catch up later"\n4. "My home is my retirement plan"\n5. "I need a lot of money to start planning"\n\nEducation is the first step. Schedule a conversation to learn more.', status: 'approved', created_by: 'ag-005', reviewer: 'ag-002', approval_date: '2025-08-01T10:00:00Z', version: 3, ai_generated: true, created_at: '2025-07-25T10:00:00Z', updated_at: '2025-08-01T10:00:00Z' },
  { id: 'content-002', agency_id: DEMO_AGENCY_ID, title: 'Family Protection Email Campaign', type: 'email', content: 'Subject: Is your family financially protected?\n\nDear [First Name],\n\nLife is unpredictable, but your family\'s financial security doesn\'t have to be. Our educational consultation can help you understand your options for protecting what matters most.\n\nThis is educational information only and not a recommendation to purchase any specific product.', status: 'pending_review', created_by: 'ag-005', reviewer: null, approval_date: null, version: 1, ai_generated: true, created_at: '2025-08-10T10:00:00Z', updated_at: '2025-08-10T10:00:00Z' },
  { id: 'content-003', agency_id: DEMO_AGENCY_ID, title: 'Understanding Emergency Funds — Educational Article', type: 'educational_article', content: 'An emergency fund is a foundational element of financial wellness. Most financial professionals recommend having 3-6 months of living expenses saved. This article covers:\n\n- Why emergency funds matter\n- How to calculate your target\n- Strategies for building your fund\n- When to use it\n\nThis article is for educational purposes only and does not constitute financial advice.', status: 'draft', created_by: 'ag-005', reviewer: null, approval_date: null, version: 1, ai_generated: false, created_at: '2025-08-13T10:00:00Z', updated_at: '2025-08-13T10:00:00Z' },
];

const demoLeadEvents: LeadEvent[] = demoLeads.slice(0, 15).map((lead, i) => ({
  id: `event-${String(i + 1).padStart(3, '0')}`,
  lead_id: lead.id,
  agency_id: DEMO_AGENCY_ID,
  event_type: i === 0 ? 'lead_created' : i % 3 === 0 ? 'status_change' : i % 3 === 1 ? 'note_added' : 'appointment_scheduled',
  description: ['Lead created from financial checkup', 'Status updated to qualified', 'Note added by agent', 'Appointment scheduled'][i % 4],
  metadata: null,
  created_at: lead.created_at,
}));

const demoCandidateEvents: CandidateEvent[] = demoCandidates.slice(0, 4).map((c, i) => ({
  id: `cand-event-${String(i + 1).padStart(3, '0')}`,
  candidate_id: c.id,
  agency_id: DEMO_AGENCY_ID,
  event_type: ['candidate_created', 'discovery_call_completed', 'licensing_started', 'licensed'][i],
  description: ['Candidate submitted career interest form', 'Completed discovery call with agency admin', 'Began licensing process', 'Received license'][i],
  created_at: c.created_at,
}));

const demoAuditLogs: AuditLog[] = [
  { id: 'audit-001', agency_id: DEMO_AGENCY_ID, user_id: 'ag-002', action: 'login', entity_type: 'auth', entity_id: null, metadata: null, created_at: '2025-08-14T08:00:00Z' },
  { id: 'audit-002', agency_id: DEMO_AGENCY_ID, user_id: 'ag-001', action: 'lead_assigned', entity_type: 'lead', entity_id: 'lead-003', metadata: { agent_id: 'ag-003' }, created_at: '2025-08-10T10:30:00Z' },
  { id: 'audit-003', agency_id: DEMO_AGENCY_ID, user_id: 'ag-005', action: 'content_created', entity_type: 'content_asset', entity_id: 'content-002', metadata: null, created_at: '2025-08-10T10:00:00Z' },
];

// --- Repository Implementation ---

export const demoRepository = {
  isDemo: true,

  async getAgency(): Promise<Agency> {
    return demoAgency;
  },

  async getAgents(): Promise<Agent[]> {
    return demoAgents;
  },

  async getLeads(): Promise<Lead[]> {
    return demoLeads;
  },

  async getLead(id: string): Promise<Lead | null> {
    return demoLeads.find((l) => l.id === id) || null;
  },

  async getLeadEvents(leadId: string): Promise<LeadEvent[]> {
    return demoLeadEvents.filter((e) => e.lead_id === leadId);
  },

  async getAppointments(): Promise<Appointment[]> {
    return demoAppointments;
  },

  async getAppointmentsByLead(leadId: string): Promise<Appointment[]> {
    return demoAppointments.filter((a) => a.lead_id === leadId);
  },

  async getCandidates(): Promise<Candidate[]> {
    return demoCandidates;
  },

  async getCandidate(id: string): Promise<Candidate | null> {
    return demoCandidates.find((c) => c.id === id) || null;
  },

  async getCandidateEvents(candidateId: string): Promise<CandidateEvent[]> {
    return demoCandidateEvents.filter((e) => e.candidate_id === candidateId);
  },

  async getCampaigns(): Promise<Campaign[]> {
    return demoCampaigns;
  },

  async getContentAssets(): Promise<ContentAsset[]> {
    return demoContentAssets;
  },

  async getAuditLogs(): Promise<AuditLog[]> {
    return demoAuditLogs;
  },

  async createLead(data: CreateLeadInput): Promise<Lead> {
    // Score is derived here, not accepted from the caller.
    const scored = data.checkup_responses
      ? scoreLead(data.checkup_responses)
      : { score: 0, tier: 'low' as const };

    const newLead: Lead = {
      id: `lead-new-${Date.now()}`,
      agency_id: DEMO_AGENCY_ID,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
      source: data.source || 'direct',
      campaign_id: data.campaign_id || null,
      utm_source: data.utm_source || null,
      utm_medium: data.utm_medium || null,
      utm_campaign: data.utm_campaign || null,
      status: 'new',
      score: scored.score,
      score_tier: scored.tier,
      interest: data.interest || null,
      assigned_agent_id: null,
      consent: data.consent || false,
      consent_method: data.consent_method || 'checkup_form',
      preferred_contact: data.preferred_contact || null,
      checkup_responses: data.checkup_responses || null,
      ai_summary: data.ai_summary || null,
      notes: null,
      last_activity: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    demoLeads.unshift(newLead);
    return newLead;
  },

  async updateLead(id: string, updates: UpdateLeadInput): Promise<Lead | null> {
    const lead = demoLeads.find((l) => l.id === id);
    if (!lead) return null;
    Object.assign(lead, updates, { last_activity: new Date().toISOString() });
    return lead;
  },

  async createAppointment(data: CreateAppointmentInput): Promise<Appointment> {
    const newApt: Appointment = {
      id: `apt-new-${Date.now()}`,
      agency_id: DEMO_AGENCY_ID,
      lead_id: data.lead_id,
      agent_id: data.agent_id || null,
      date: data.date,
      time: data.time,
      meeting_type: data.meeting_type || 'Educational Consultation',
      status: 'requested',
      notes: data.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    demoAppointments.unshift(newApt);
    const lead = demoLeads.find((l) => l.id === newApt.lead_id);
    if (lead) {
      lead.status = 'appointment';
      lead.last_activity = new Date().toISOString();
    }
    return newApt;
  },

  async updateAppointment(id: string, updates: UpdateAppointmentInput): Promise<Appointment | null> {
    const apt = demoAppointments.find((a) => a.id === id);
    if (!apt) return null;
    Object.assign(apt, updates, { updated_at: new Date().toISOString() });
    return apt;
  },

  async createCandidate(data: CreateCandidateInput): Promise<Candidate> {
    // Score is derived here, not accepted from the caller.
    const scored = scoreCandidate(data);

    const newCand: Candidate = {
      id: `cand-new-${Date.now()}`,
      agency_id: DEMO_AGENCY_ID,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
      state: data.state,
      current_occupation: data.current_occupation,
      years_experience: data.years_experience,
      why_interested: data.why_interested,
      sales_experience: data.sales_experience,
      financial_services_experience: data.financial_services_experience,
      preferred_contact: data.preferred_contact,
      status: 'new',
      score: scored.score,
      score_breakdown: scored.breakdown,
      assigned_agent_id: null,
      created_at: new Date().toISOString(),
    };
    demoCandidates.unshift(newCand);
    return newCand;
  },

  async updateCandidate(id: string, updates: UpdateCandidateInput): Promise<Candidate | null> {
    const cand = demoCandidates.find((c) => c.id === id);
    if (!cand) return null;
    Object.assign(cand, updates);
    return cand;
  },

  async updateContentStatus(id: string, status: ContentStatus): Promise<ContentAsset | null> {
    const asset = demoContentAssets.find((a) => a.id === id);
    if (!asset) return null;
    asset.status = status;
    asset.updated_at = new Date().toISOString();
    if (status === 'approved') {
      asset.approval_date = new Date().toISOString();
    }
    return asset;
  },

  async createContentAsset(data: CreateContentAssetInput): Promise<ContentAsset> {
    const newAsset: ContentAsset = {
      id: `content-new-${Date.now()}`,
      agency_id: DEMO_AGENCY_ID,
      title: data.title,
      type: data.type,
      content: data.content,
      status: 'draft',
      // TODO: resolve the acting user from the session once real auth exists.
      created_by: DEMO_AUTHOR_AGENT_ID,
      reviewer: null,
      approval_date: null,
      version: 1,
      ai_generated: data.ai_generated || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    demoContentAssets.unshift(newAsset);
    return newAsset;
  },

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const totalLeads = demoLeads.length;
    const qualifiedLeads = demoLeads.filter((l) => ['qualified', 'appointment', 'client'].includes(l.status)).length;
    const appointments = demoAppointments.filter((a) => ['scheduled', 'confirmed', 'completed'].includes(a.status)).length;
    const conversionRate = totalLeads > 0 ? Math.round((demoLeads.filter((l) => l.status === 'appointment' || l.status === 'client').length / totalLeads) * 100) : 0;
    const recruitingCandidates = demoCandidates.filter((c) => !['declined'].includes(c.status)).length;
    const activeAgents = demoAgents.filter((a) => a.status === 'active').length;
    const campaignSpend = demoCampaigns.reduce((sum, c) => sum + (c.budget || 0), 0);
    const clientLeads = demoLeads.filter((l) => l.status === 'client').length;
    const campaignROI = campaignSpend > 0 ? Math.round(((clientLeads * 2500 - campaignSpend) / campaignSpend) * 100) : 0;

    return {
      total_leads: totalLeads,
      qualified_leads: qualifiedLeads,
      appointments: appointments,
      conversion_rate: conversionRate,
      recruiting_candidates: recruitingCandidates,
      active_agents: activeAgents,
      campaign_roi: campaignROI,
    };
  },
};
