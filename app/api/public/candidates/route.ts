import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parsePublicRequest, trustedNhostFailure } from '@/lib/http/public-request';
import { trustedCreateCandidate } from '@/lib/nhost/server';
import { scoreCandidate } from '@/lib/scoring';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { withOperationalLogging } from '@/lib/observability/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const text = (max: number) => z.string().trim().min(1).max(max);
const candidateSchema = z.object({
  agency_slug: z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  idempotency_key: z.string().uuid().optional(),
  first_name: text(120),
  last_name: text(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(7).max(40).regex(/^[0-9()+\-\s.]+$/),
  state: text(80),
  current_occupation: text(200),
  years_experience: z.enum(['0-2', '3-5', '6-10', '10+']),
  why_interested: text(2_000),
  sales_experience: z.enum(['none', 'some', 'extensive']),
  financial_services_experience: z.enum(['none', 'some', 'extensive']),
  preferred_contact: z.enum(['phone', 'email', 'text', 'video']),
}).strict();

async function handlePost(request: Request) {
  const parsed = await parsePublicRequest(request, candidateSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.value;
  const agencySlug = body.agency_slug ?? process.env.AGENCY_SLUG ?? process.env.NEXT_PUBLIC_AGENCY_SLUG;
  if (!agencySlug) return NextResponse.json({ error: 'Candidate intake is not configured for an agency.' }, { status: 503 });
  const scored = scoreCandidate(body);

  if (process.env.NEXT_PUBLIC_DATA_MODE === 'nhost') {
    if (!body.idempotency_key) {
      return NextResponse.json({ error: 'Idempotency key is required.' }, { status: 400 });
    }
    try {
      const candidate = await trustedCreateCandidate({
        idempotencyKey: body.idempotency_key,
        agencySlug,
        firstName: body.first_name,
        lastName: body.last_name,
        email: body.email,
        phone: body.phone,
        state: body.state,
        currentOccupation: body.current_occupation,
        yearsExperience: body.years_experience,
        whyInterested: body.why_interested,
        salesExperience: body.sales_experience,
        financialServicesExperience: body.financial_services_experience,
        preferredContact: body.preferred_contact,
        score: scored.score,
        scoreBreakdown: scored.breakdown,
      });
      return NextResponse.json(candidate, { status: 201, headers: { 'cache-control': 'no-store' } });
    } catch (error) {
      return trustedNhostFailure(error);
    }
  }

  if (!supabaseAdmin) return NextResponse.json({ error: 'Candidate intake is not configured.' }, { status: 503 });
  const { data: agency, error: agencyError } = await supabaseAdmin.from('agencies').select('id').eq('public_slug', agencySlug).single();
  if (agencyError || !agency) return NextResponse.json({ error: 'Candidate intake agency is unavailable.' }, { status: 503 });
  const { agency_slug: _slug, ...candidateInput } = body;
  const { data, error } = await supabaseAdmin.from('candidates').insert({
    agency_id: agency.id,
    ...candidateInput,
    status: 'new',
    score: scored.score,
    score_breakdown: scored.breakdown,
  }).select('*').single();
  if (error) return NextResponse.json({ error: 'Could not create the candidate.' }, { status: 500 });
  return NextResponse.json(data, { status: 201, headers: { 'cache-control': 'no-store' } });
}

export const POST = withOperationalLogging('/api/public/candidates', handlePost);
