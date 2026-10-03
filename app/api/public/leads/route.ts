import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parsePublicRequest, trustedNhostFailure } from '@/lib/http/public-request';
import { trustedCreateLead } from '@/lib/nhost/server';
import { scoreLead } from '@/lib/scoring';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { withOperationalLogging } from '@/lib/observability/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const shortText = z.string().trim().min(1).max(120);
const optionalText = z.string().trim().max(500).nullable().optional();
const checkupSchema = z.object({
  age_range: z.enum(['18-24', '25-34', '35-44', '45-54', '55-64', '65+']),
  employment_status: z.enum(['full_time', 'part_time', 'self_employed', 'retired', 'unemployed', 'student']),
  household_income_range: z.enum(['under_50k', '50k-75k', '75k-100k', '100k-150k', '150k+']),
  dependents: z.enum(['0', '1', '2', '3_or_more']),
  retirement_savings_range: z.enum(['none', 'under_25k', '25k-100k', '100k-500k', '500k+']),
  emergency_savings_range: z.enum(['none', 'under_3_months', '3-6_months', '6+_months']),
  life_insurance_status: z.enum(['none', 'unsure', 'employer_only', 'individual_policy']),
  primary_goal: z.enum(['retirement_planning', 'family_protection', 'debt_management', 'wealth_building', 'college_funding', 'estate_planning']),
  preferred_contact_method: z.enum(['phone', 'email', 'text', 'video']),
  consent_to_contact: z.literal(true),
}).strict();

const leadSchema = z.object({
  agency_slug: z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  idempotency_key: z.string().uuid().optional(),
  first_name: shortText,
  last_name: shortText,
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(7).max(40).regex(/^[0-9()+\-\s.]+$/),
  consent: z.literal(true),
  source: z.string().trim().min(1).max(80).optional().default('direct'),
  interest: optionalText,
  consent_method: z.string().trim().max(80).nullable().optional(),
  preferred_contact: optionalText,
  checkup_responses: checkupSchema.nullable().optional(),
  ai_summary: z.string().trim().max(2_000).nullable().optional(),
}).strict();

async function handlePost(request: Request) {
  const parsed = await parsePublicRequest(request, leadSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.value;

  if (process.env.NEXT_PUBLIC_DATA_MODE === 'nhost') {
    if (!body.idempotency_key) {
      return NextResponse.json({ error: 'Idempotency key is required.' }, { status: 400 });
    }
    if (!body.checkup_responses) {
      return NextResponse.json({ error: 'Financial checkup responses are required.' }, { status: 400 });
    }
    const { score, tier } = scoreLead(body.checkup_responses);
    try {
      const lead = await trustedCreateLead({
        idempotencyKey: body.idempotency_key,
        agencySlug: body.agency_slug,
        firstName: body.first_name,
        lastName: body.last_name,
        email: body.email,
        phone: body.phone,
        source: body.source ?? 'direct',
        interest: body.interest ?? null,
        preferredContact: body.preferred_contact ?? null,
        responses: body.checkup_responses,
        score,
        scoreTier: tier,
      });
      return NextResponse.json(lead, { status: 201, headers: { 'cache-control': 'no-store' } });
    } catch (error) {
      return trustedNhostFailure(error);
    }
  }

  if (!supabaseAdmin) return NextResponse.json({ error: 'Lead intake is not configured.' }, { status: 503 });
  const responses = body.checkup_responses ?? null;
  const { score, tier } = responses ? scoreLead(responses) : { score: 0, tier: 'low' as const };
  const { data, error } = await supabaseAdmin.rpc('public_create_lead', {
    p_agency_slug: body.agency_slug,
    p_first_name: body.first_name,
    p_last_name: body.last_name,
    p_email: body.email,
    p_phone: body.phone,
    p_consent: true,
    p_score: score,
    p_score_tier: tier,
    p_source: body.source,
    p_interest: body.interest ?? null,
    p_consent_method: body.consent_method ?? null,
    p_preferred_contact: body.preferred_contact ?? null,
    p_checkup_responses: responses,
    p_ai_summary: body.ai_summary ?? null,
  }).single();
  if (error) {
    const unknownAgency = error.message.includes('unknown_agency_slug');
    return NextResponse.json({ error: unknownAgency ? 'Unknown agency.' : 'Could not create the lead.' }, { status: unknownAgency ? 404 : 500 });
  }
  return NextResponse.json(data, { status: 201, headers: { 'cache-control': 'no-store' } });
}

export const POST = withOperationalLogging('/api/public/leads', handlePost);
