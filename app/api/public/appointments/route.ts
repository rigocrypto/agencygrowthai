import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parsePublicRequest, trustedNhostFailure } from '@/lib/http/public-request';
import { trustedCreateAppointment } from '@/lib/nhost/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { withOperationalLogging } from '@/lib/observability/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const appointmentSchema = z.object({
  agency_slug: z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  idempotency_key: z.string().uuid().optional(),
  lead_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  meeting_type: z.string().trim().min(1).max(120).optional().default('Educational Consultation'),
  notes: z.string().trim().max(2_000).nullable().optional(),
}).strict();

async function handlePost(request: Request) {
  const parsed = await parsePublicRequest(request, appointmentSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.value;
  const agencySlug = body.agency_slug ?? process.env.AGENCY_SLUG ?? process.env.NEXT_PUBLIC_AGENCY_SLUG;
  if (!agencySlug) return NextResponse.json({ error: 'Appointment intake is not configured for an agency.' }, { status: 503 });

  if (process.env.NEXT_PUBLIC_DATA_MODE === 'nhost') {
    if (!body.idempotency_key) {
      return NextResponse.json({ error: 'Idempotency key is required.' }, { status: 400 });
    }
    try {
      const appointment = await trustedCreateAppointment({
        idempotencyKey: body.idempotency_key,
        agencySlug,
        leadId: body.lead_id,
        date: body.date,
        time: body.time,
        meetingType: body.meeting_type ?? 'Educational Consultation',
        notes: body.notes ?? null,
      });
      return NextResponse.json(appointment, { status: 201, headers: { 'cache-control': 'no-store' } });
    } catch (error) {
      return trustedNhostFailure(error);
    }
  }

  if (!supabaseAdmin) return NextResponse.json({ error: 'Appointment intake is not configured.' }, { status: 503 });
  const { data: agency, error: agencyError } = await supabaseAdmin.from('agencies').select('id').eq('public_slug', agencySlug).single();
  if (agencyError || !agency) return NextResponse.json({ error: 'Appointment intake agency is unavailable.' }, { status: 503 });
  const { data: lead, error: leadError } = await supabaseAdmin.from('leads').select('id').eq('id', body.lead_id).eq('agency_id', agency.id).single();
  if (leadError || !lead) return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });
  const { data, error } = await supabaseAdmin.from('appointments').insert({
    agency_id: agency.id,
    lead_id: body.lead_id,
    date: body.date,
    time: body.time,
    meeting_type: body.meeting_type,
    notes: body.notes ?? null,
    status: 'requested',
  }).select('*').single();
  if (error) return NextResponse.json({ error: 'Could not create the appointment.' }, { status: 500 });
  return NextResponse.json(data, { status: 201, headers: { 'cache-control': 'no-store' } });
}

export const POST = withOperationalLogging('/api/public/appointments', handlePost);
