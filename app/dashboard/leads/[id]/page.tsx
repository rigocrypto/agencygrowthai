'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, Phone, Calendar, User, Activity, Brain, ShieldCheck } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { isNhostMode, repo } from '@/lib/repo';
import { LEAD_STATUSES, LEAD_SCORE_TIERS, ROLES } from '@/lib/constants';
import { aiProvider } from '@/lib/ai';
import type { Lead, Agent, Appointment, LeadEvent } from '@/lib/types';

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [lead, setLead] = useState<Lead | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [events, setEvents] = useState<LeadEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    (async () => {
      const [l, a, appts, evts] = await Promise.all([
        repo.getLead(id),
        repo.getAgents(),
        repo.getAppointmentsByLead(id),
        repo.getLeadEvents(id),
      ]);
      setLead(l);
      setAgents(a);
      setAppointments(appts);
      setEvents(evts);
      setLoading(false);
    })();
  }, [id]);

  const handleAssignAgent = async (agentId: string) => {
    if (!lead) return;
    const updated = await repo.updateLead(lead.id, { assigned_agent_id: agentId });
    if (updated) {
      setLead(updated);
      toast.success('Agent assigned successfully');
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!lead) return;
    const updated = await repo.updateLead(lead.id, { status: status as Lead['status'] });
    if (updated) {
      setLead(updated);
      toast.success('Status updated');
    }
  };

  const handleAISummarize = async () => {
    if (!lead) return;
    setAiLoading(true);
    try {
      const result = await aiProvider.summarizeLead({
        name: `${lead.first_name} ${lead.last_name}`,
        interest: lead.interest,
        score: lead.score,
        status: lead.status,
        checkup: lead.checkup_responses as Record<string, string> | null,
      });
      setAiSummary(result.summary);
      toast.success('AI summary generated');
    } catch {
      toast.error('Could not generate AI summary');
    }
    setAiLoading(false);
  };

  const handleAddNote = async () => {
    if (!lead || !noteText.trim()) return;
    const updated = await repo.updateLead(lead.id, { notes: (lead.notes || '') + '\n' + noteText });
    if (updated) {
      setLead(updated);
      setNoteText('');
      toast.success('Note added');
    }
  };

  if (loading) {
    return (
      <DashboardShell title="Lead Details" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Leads', href: '/dashboard/leads' }, { label: 'Details' }]}>
        <div className="space-y-4">{[...Array(3)].map((_, i) => <Card key={i} className="animate-pulse h-40" />)}</div>
      </DashboardShell>
    );
  }

  if (!lead) {
    return (
      <DashboardShell title="Lead Not Found" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Leads', href: '/dashboard/leads' }, { label: 'Not Found' }]}>
        <Card><CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Lead not found.</p>
          <Button asChild variant="outline" className="mt-4"><Link href="/dashboard/leads">Back to Leads</Link></Button>
        </CardContent></Card>
      </DashboardShell>
    );
  }

  const tier = LEAD_SCORE_TIERS[lead.score_tier];

  return (
    <DashboardShell title={`${lead.first_name} ${lead.last_name}`} breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Leads', href: '/dashboard/leads' }, { label: `${lead.first_name} ${lead.last_name}` }]}>
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm"><Link href="/dashboard/leads"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Leads</Link></Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Contact Info & Details */}
        <div className="space-y-6">
          <Card className="border-border/60">
            <CardHeader><CardTitle className="text-base">Contact Information</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-muted-foreground" /> {lead.email}</div>
              <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-muted-foreground" /> {lead.phone}</div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Lead Score</span>
                <Badge variant="outline" className={tier.color}>{lead.score} — {tier.label}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Select value={lead.status} onValueChange={handleStatusChange}>
                  <SelectTrigger aria-label="Lead status" className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEAD_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Assigned Agent</span>
                <Select value={lead.assigned_agent_id || 'unassigned'} onValueChange={handleAssignAgent} disabled={isNhostMode}>
                  <SelectTrigger aria-label="Assigned agent" className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {agents.map((a) => <SelectItem key={a.id} value={a.id}>{a.first_name} {a.last_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Source</span>
                <Badge variant="outline" className="capitalize">{lead.source}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Consent</span>
                <Badge variant={lead.consent ? 'default' : 'destructive'} className="flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> {lead.consent ? 'Yes' : 'No'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {lead.checkup_responses && (
            <Card className="border-border/60">
              <CardHeader><CardTitle className="text-base">Financial Checkup Responses</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(lead.checkup_responses).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="font-medium capitalize">{String(value).replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Center: AI Summary, Appointments, Timeline */}
        <div className="space-y-6 lg:col-span-2">
          {/* AI Summary */}
          <Card className="border-border/60">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Brain className="h-4 w-4 text-primary" /> AI Lead Summary</CardTitle>
              <Button size="sm" variant="outline" onClick={handleAISummarize} disabled={aiLoading}>
                {aiLoading ? 'Generating...' : 'Generate Summary'}
              </Button>
            </CardHeader>
            <CardContent>
              {aiSummary || lead.ai_summary ? (
                <div className="space-y-3">
                  <p className="text-sm">{aiSummary || lead.ai_summary}</p>
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
                    <p className="text-xs text-amber-700 dark:text-amber-400">AI-generated summary — for internal use. Not financial advice.</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Click &quot;Generate Summary&quot; to get an AI-powered lead analysis.</p>
              )}
            </CardContent>
          </Card>

          {/* Appointments */}
          <Card className="border-border/60">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /> Appointments</CardTitle>
              <Button asChild size="sm" variant="outline">
                <Link href={`/dashboard/appointments?lead=${lead.id}`}>Schedule</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {appointments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No appointments scheduled.</p>
              ) : (
                appointments.map((apt) => (
                  <div key={apt.id} className="flex items-center justify-between rounded-md border border-border/40 p-3">
                    <div>
                      <p className="text-sm font-medium">{apt.meeting_type}</p>
                      <p className="text-xs text-muted-foreground">{apt.date} at {apt.time}</p>
                    </div>
                    <Badge variant="secondary" className="capitalize">{apt.status.replace(/_/g, ' ')}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="border-border/60">
            <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {lead.notes && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{lead.notes}</p>}
              <div className="space-y-2">
                <Label htmlFor="note">Add a note</Label>
                <Textarea id="note" rows={2} value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Write a note..." />
                <Button size="sm" onClick={handleAddNote} disabled={!noteText.trim()}>Add Note</Button>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card className="border-border/60">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Timeline</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
              ) : (
                events.map((evt) => (
                  <div key={evt.id} className="flex gap-3">
                    <div className="flex h-2 w-2 flex-shrink-0 rounded-full bg-primary mt-1.5" />
                    <div>
                      <p className="text-sm font-medium">{evt.description}</p>
                      <p className="text-xs text-muted-foreground">{new Date(evt.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
