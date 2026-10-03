'use client';

import { useEffect, useState, useMemo } from 'react';
import { Calendar as CalendarIcon, Plus, Loader2 } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { isNhostMode, repo } from '@/lib/repo';
import { APPOINTMENT_STATUSES } from '@/lib/constants';
import { calendarProvider } from '@/lib/integrations/calendar';
import type { Appointment, Lead, Agent } from '@/lib/types';

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newApt, setNewApt] = useState({ lead_id: '', agent_id: '', date: '', time: '10:00', meeting_type: 'Educational Consultation' });

  useEffect(() => {
    (async () => {
      const [a, l, ag] = await Promise.all([repo.getAppointments(), repo.getLeads(), repo.getAgents()]);
      setAppointments(a);
      setLeads(l);
      setAgents(ag);
      setLoading(false);
    })();
  }, []);

  const leadMap = useMemo(() => {
    const map: Record<string, string> = {};
    leads.forEach((l) => { map[l.id] = `${l.first_name} ${l.last_name}`; });
    return map;
  }, [leads]);

  const agentMap = useMemo(() => {
    const map: Record<string, string> = {};
    agents.forEach((a) => { map[a.id] = `${a.first_name} ${a.last_name}`; });
    return map;
  }, [agents]);

  const handleStatusChange = async (id: string, status: string) => {
    const updated = await repo.updateAppointment(id, { status: status as Appointment['status'] });
    if (updated) {
      setAppointments((prev) => prev.map((a) => a.id === id ? updated : a));
      toast.success('Appointment status updated');
    }
  };

  const handleCreate = async () => {
    if (!newApt.lead_id || !newApt.date) {
      toast.error('Please select a lead and date');
      return;
    }
    setSubmitting(true);
    const lead = leads.find((l) => l.id === newApt.lead_id);
    try {
      // Use calendar provider abstraction (DEMO / NOT CONNECTED)
      await calendarProvider.createEvent({
        title: newApt.meeting_type,
        date: newApt.date,
        time: newApt.time,
        attendee_name: lead ? `${lead.first_name} ${lead.last_name}` : 'Lead',
        attendee_email: lead?.email || '',
      });
      const created = await repo.createAppointment({
        lead_id: newApt.lead_id,
        agent_id: newApt.agent_id || null,
        date: newApt.date,
        time: newApt.time,
        meeting_type: newApt.meeting_type,
      });
      setAppointments((prev) => [created, ...prev]);
      setDialogOpen(false);
      setNewApt({ lead_id: '', agent_id: '', date: '', time: '10:00', meeting_type: 'Educational Consultation' });
      toast.success('Appointment created');
    } catch {
      toast.error('Could not create appointment');
    }
    setSubmitting(false);
  };

  return (
    <DashboardShell title="Appointments" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Appointments' }]}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Calendar integration: <Badge variant="outline" className="ml-1">{calendarProvider.name}</Badge>
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={isNhostMode}><Plus className="mr-1 h-4 w-4" /> New Appointment</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule New Appointment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Lead *</Label>
                <Select value={newApt.lead_id} onValueChange={(v) => setNewApt({ ...newApt, lead_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select a lead" /></SelectTrigger>
                  <SelectContent>
                    {leads.map((l) => <SelectItem key={l.id} value={l.id}>{l.first_name} {l.last_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Agent</Label>
                <Select value={newApt.agent_id || 'none'} onValueChange={(v) => setNewApt({ ...newApt, agent_id: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Select an agent" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {agents.map((a) => <SelectItem key={a.id} value={a.id}>{a.first_name} {a.last_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input type="date" value={newApt.date} onChange={(e) => setNewApt({ ...newApt, date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input type="time" value={newApt.time} onChange={(e) => setNewApt({ ...newApt, time: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Meeting Type</Label>
                <Select value={newApt.meeting_type} onValueChange={(v) => setNewApt({ ...newApt, meeting_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Educational Consultation', 'Follow-up Call', 'Discovery Call', 'Virtual Meeting'].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Appointment'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border/60">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-6">{[...Array(4)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded bg-muted" />)}</div>
          ) : appointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CalendarIcon className="h-12 w-12 text-muted-foreground/30" />
              <p className="mt-4 text-sm text-muted-foreground">No appointments scheduled.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead className="hidden sm:table-cell">Agent</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead className="hidden md:table-cell">Type</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((apt) => (
                  <TableRow key={apt.id}>
                    <TableCell className="font-medium">{leadMap[apt.lead_id] || '—'}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{apt.agent_id ? agentMap[apt.agent_id] || '—' : 'Unassigned'}</TableCell>
                    <TableCell className="text-sm">{apt.date} at {apt.time}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{apt.meeting_type}</TableCell>
                    <TableCell>
                      <Select value={apt.status} onValueChange={(v) => handleStatusChange(apt.id, v)}>
                        <SelectTrigger aria-label={`Appointment status for ${leadMap[apt.lead_id] || 'lead'}`} className="w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {APPOINTMENT_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
