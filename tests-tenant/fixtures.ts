import { scoreLead } from '@/lib/scoring';
import type { CheckupResponses } from '@/lib/types';

/*
Fixture identifiers shared by the seed script and the isolation suite.
Keep these in sync with supabase/seed/tenant_isolation_seed.sql.
All data is fictional and prefixed so it is obvious in any dashboard.
*/

export const AGENCY_A = {
  id: 'aaaaaaaa-0000-4000-8000-0000000000a1',
  name: 'Horizon Financial Group',
  slug: 'horizon-financial-group',
} as const;

export const AGENCY_B = {
  id: 'bbbbbbbb-0000-4000-8000-0000000000b1',
  name: 'Summit Financial Advisors',
  slug: 'summit-financial-advisors',
} as const;

// Deliberately unmistakable names — a leaked row is obvious at a glance.
export const LEADS_A = [
  { id: 'aaaaaaaa-0000-4000-8000-00000000a101', email: 'alice.agency.a@agencygrowthai.test' },
  { id: 'aaaaaaaa-0000-4000-8000-00000000a102', email: 'aaron.agency.a@agencygrowthai.test' },
] as const;

export const LEADS_B = [
  { id: 'bbbbbbbb-0000-4000-8000-00000000b101', email: 'bob.agency.b@agencygrowthai.test' },
  { id: 'bbbbbbbb-0000-4000-8000-00000000b102', email: 'brenda.agency.b@agencygrowthai.test' },
] as const;

/*
A fixed set of checkup answers plus the score the application's own rules produce for
them. The expectation is derived from scoreLead(), not hardcoded: the assertion is
"the database stored what the server computed", which stays true if the rules change.
*/
export const SCORING_ANSWERS: CheckupResponses = {
  age_range: '35-44',
  employment_status: 'full_time',
  household_income_range: '75k-100k',
  dependents: '2',
  retirement_savings_range: '25k-100k',
  emergency_savings_range: '3-6_months',
  life_insurance_status: 'employer_only',
  primary_goal: 'retirement_planning',
  preferred_contact_method: 'email',
  consent_to_contact: true,
};

export const EXPECTED_SCORE_FOR_ANSWERS = scoreLead(SCORING_ANSWERS).score;

/*
Every tenant-owned table, with one seeded row per agency. `agencies` is excluded: it is
the tenant root itself and carries no agency_id column, so it is covered separately.

`insert` is a minimal valid body — enough to satisfy NOT NULL and CHECK constraints — so
that a rejection can only come from the tenant policy, never from column validation.
`publicInsert` marks the tables that still carry a public_insert_* policy: the same shape
that turned out to be exploitable on `leads`.
*/
type TenantTable = {
  table: string;
  rowA: string;
  rowB: string;
  publicInsert: boolean;
  insert: (agencyId: string, id: string) => Record<string, unknown>;
};

const uuid = (side: 'A' | 'B', tag: number, n = 1) =>
  `${side === 'A' ? 'aaaaaaaa' : 'bbbbbbbb'}-0000-4000-8000-${String(tag).padStart(4, '0')}${String(n).padStart(8, '0')}`;

const LEAD_OF = { A: LEADS_A[0].id, B: LEADS_B[0].id } as const;

export const TENANT_TABLES: TenantTable[] = [
  {
    table: 'leads',
    rowA: LEADS_A[0].id,
    rowB: LEADS_B[0].id,
    publicInsert: true,
    insert: (agency_id, id) => ({
      id, agency_id, first_name: 'X', last_name: 'Y', email: `probe.${id}@agencygrowthai.test`,
      phone: '1', source: 'direct', status: 'new', score: 0, score_tier: 'low', consent: true,
    }),
  },
  {
    table: 'candidates',
    rowA: uuid('A', 11), rowB: uuid('B', 11), publicInsert: true,
    insert: (agency_id, id) => ({
      id, agency_id, first_name: 'X', last_name: 'Y', email: `probe.${id}@agencygrowthai.test`,
      status: 'new', score: 0,
      score_breakdown: { interest: 0, experience: 0, availability: 0, communication: 0, career_intent: 0 },
    }),
  },
  {
    table: 'appointments',
    rowA: uuid('A', 14), rowB: uuid('B', 14), publicInsert: true,
    insert: (agency_id, id) => ({
      id, agency_id, lead_id: agency_id.startsWith('aaaa') ? LEAD_OF.A : LEAD_OF.B,
      date: '2026-09-02', time: '11:00', meeting_type: 'Educational Consultation', status: 'requested',
    }),
  },
  {
    table: 'campaigns',
    rowA: uuid('A', 12), rowB: uuid('B', 12), publicInsert: false,
    insert: (agency_id, id) => ({
      id, agency_id, name: 'Probe', platform: 'facebook', campaign_type: 'lead_gen', status: 'active',
    }),
  },
  {
    table: 'content_assets',
    rowA: uuid('A', 13), rowB: uuid('B', 13), publicInsert: false,
    insert: (agency_id, id) => ({
      id, agency_id, title: 'Probe', type: 'social_post', content: 'x', status: 'draft',
      ai_generated: false, version: 1,
    }),
  },
  {
    table: 'lead_events',
    rowA: uuid('A', 15), rowB: uuid('B', 15), publicInsert: false,
    insert: (agency_id, id) => ({
      id, agency_id, lead_id: agency_id.startsWith('aaaa') ? LEAD_OF.A : LEAD_OF.B,
      event_type: 'probe', description: 'probe',
    }),
  },
  {
    table: 'candidate_events',
    rowA: uuid('A', 16), rowB: uuid('B', 16), publicInsert: false,
    insert: (agency_id, id) => ({
      id, agency_id, candidate_id: agency_id.startsWith('aaaa') ? uuid('A', 11) : uuid('B', 11),
      event_type: 'probe', description: 'probe',
    }),
  },
  {
    table: 'campaign_events',
    rowA: uuid('A', 17), rowB: uuid('B', 17), publicInsert: false,
    insert: (agency_id, id) => ({
      id, agency_id, campaign_id: agency_id.startsWith('aaaa') ? uuid('A', 12) : uuid('B', 12),
      event_type: 'impression',
    }),
  },
  {
    table: 'content_reviews',
    rowA: uuid('A', 18), rowB: uuid('B', 18), publicInsert: false,
    insert: (agency_id, id) => ({
      id, agency_id, content_asset_id: agency_id.startsWith('aaaa') ? uuid('A', 13) : uuid('B', 13),
      action: 'submit_review',
    }),
  },
  {
    table: 'ai_interactions',
    rowA: uuid('A', 19), rowB: uuid('B', 19), publicInsert: false,
    insert: (agency_id, id) => ({ id, agency_id, interaction_type: 'summary' }),
  },
  {
    table: 'consents',
    rowA: uuid('A', 20), rowB: uuid('B', 20), publicInsert: true,
    insert: (agency_id, id) => ({ id, agency_id, consent_type: 'contact', consent_text: 'probe' }),
  },
  {
    table: 'audit_logs',
    rowA: uuid('A', 21), rowB: uuid('B', 21), publicInsert: false,
    insert: (agency_id, id) => ({ id, agency_id, action: 'probe' }),
  },
  {
    table: 'settings',
    rowA: uuid('A', 22), rowB: uuid('B', 22), publicInsert: false,
    insert: (agency_id, id) => ({ id, agency_id, key: `probe_${id.slice(-6)}`, value: { v: 1 } }),
  },
  {
    table: 'agents',
    rowA: '', rowB: '', publicInsert: false, // rows exist but ids are server-generated
    insert: (agency_id, id) => ({
      id, agency_id, first_name: 'Probe', last_name: 'Agent',
      email: `probe.${id}@agencygrowthai.test`, role: 'agent', status: 'active', license_status: 'unlicensed',
    }),
  },
];

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. The tenant isolation suite needs a seeded Supabase project — see supabase/seed/README.md`
    );
  }
  return value;
}

export const env = {
  get url() {
    return required('NEXT_PUBLIC_SUPABASE_URL').replace(/\/$/, '');
  },
  get anonKey() {
    return required('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  },
  /** The running app, which owns the trusted lead-intake route. */
  get appUrl() {
    return (process.env.TENANT_TEST_APP_URL ?? 'http://127.0.0.1:3100').replace(/\/$/, '');
  },
  get userA() {
    return { email: required('TENANT_TEST_A_EMAIL'), password: required('TENANT_TEST_A_PASSWORD') };
  },
  get userB() {
    return { email: required('TENANT_TEST_B_EMAIL'), password: required('TENANT_TEST_B_PASSWORD') };
  },
};
