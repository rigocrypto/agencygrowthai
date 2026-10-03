'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LEAD_SCORE_TIERS, CAMPAIGN_PLATFORMS } from '@/lib/constants';
import { repo } from '@/lib/repo';
import type { Lead, Appointment, Candidate, Agent, Campaign } from '@/lib/types';

const PIE_COLORS = ['#0f766e', '#0c4a6e', '#0891b2', '#ca8a04', '#7c3aed', '#be185d', '#0369a1', '#16a34a', '#9333ea'];

export default function AnalyticsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');

  useEffect(() => {
    (async () => {
      const [l, a, c, ag, cmp] = await Promise.all([
        repo.getLeads(), repo.getAppointments(), repo.getCandidates(), repo.getAgents(), repo.getCampaigns(),
      ]);
      setLeads(l);
      setAppointments(a);
      setCandidates(c);
      setAgents(ag);
      setCampaigns(cmp);
      setLoading(false);
    })();
  }, []);

  const filteredLeads = useMemo(() => {
    const days = parseInt(dateRange);
    const cutoff = new Date(Date.now() - days * 86400000);
    return leads.filter((l) => new Date(l.created_at) >= cutoff);
  }, [leads, dateRange]);

  const leadsBySource = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredLeads.forEach((l) => { counts[l.source] = (counts[l.source] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name: name.replace(/\b\w/g, (c) => c.toUpperCase()), value }));
  }, [filteredLeads]);

  const leadsOverTime = useMemo(() => {
    const days = parseInt(dateRange);
    const buckets: Record<string, number> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().split('T')[0];
      buckets[key] = 0;
    }
    filteredLeads.forEach((l) => {
      const key = l.created_at.split('T')[0];
      if (buckets[key] !== undefined) buckets[key]++;
    });
    return Object.entries(buckets).map(([date, count]) => ({ date: date.substring(5), count }));
  }, [filteredLeads, dateRange]);

  const scoreDistribution = useMemo(() => {
    const tiers = { low: 0, moderate: 0, high: 0, priority: 0 };
    filteredLeads.forEach((l) => { tiers[l.score_tier]++; });
    return Object.entries(tiers).map(([key, value]) => ({ name: LEAD_SCORE_TIERS[key as keyof typeof LEAD_SCORE_TIERS].label, value }));
  }, [filteredLeads]);

  const appointmentsOverTime = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
    return months.map((m, i) => ({
      month: m,
      appointments: appointments.filter((a) => new Date(a.date).getMonth() === i).length,
    }));
  }, [appointments]);

  const agentPerformance = useMemo(() => {
    return agents.map((a) => {
      const assignedLeads = leads.filter((l) => l.assigned_agent_id === a.id);
      return {
        name: `${a.first_name} ${a.last_name.charAt(0)}.`,
        leads: assignedLeads.length,
        qualified: assignedLeads.filter((l) => ['qualified', 'appointment', 'client'].includes(l.status)).length,
      };
    });
  }, [agents, leads]);

  const campaignPerformance = useMemo(() => {
    return campaigns.map((c) => {
      const cLeads = leads.filter((l) => l.campaign_id === c.id || l.utm_campaign === c.utm_campaign);
      return {
        name: c.name.substring(0, 15),
        leads: cLeads.length,
        qualified: cLeads.filter((l) => ['qualified', 'appointment', 'client'].includes(l.status)).length,
      };
    });
  }, [campaigns, leads]);

  if (loading) {
    return (
      <DashboardShell title="Analytics" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Analytics' }]}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{[...Array(4)].map((_, i) => <Card key={i} className="animate-pulse h-64" />)}</div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Analytics" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Analytics' }]}>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{filteredLeads.length} leads in selected period</p>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 days</SelectItem>
            <SelectItem value="30">30 days</SelectItem>
            <SelectItem value="90">90 days</SelectItem>
            <SelectItem value="365">12 months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Leads by Source */}
        <Card className="border-border/60">
          <CardHeader><CardTitle className="text-base">Leads by Source</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={leadsBySource} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(entry) => entry.name ?? ''}>
                  {leadsBySource.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Leads Over Time */}
        <Card className="border-border/60">
          <CardHeader><CardTitle className="text-base">Leads Over Time</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={leadsOverTime}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#0f766e" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Score Distribution */}
        <Card className="border-border/60">
          <CardHeader><CardTitle className="text-base">Lead Score Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={scoreDistribution}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="value" fill="#0c4a6e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Appointments Over Time */}
        <Card className="border-border/60">
          <CardHeader><CardTitle className="text-base">Appointments Over Time</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={appointmentsOverTime}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="appointments" fill="#0891b2" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Agent Performance */}
        <Card className="border-border/60">
          <CardHeader><CardTitle className="text-base">Agent Performance</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={agentPerformance}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Legend />
                <Bar dataKey="leads" fill="#0f766e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="qualified" fill="#0891b2" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Campaign Performance */}
        <Card className="border-border/60">
          <CardHeader><CardTitle className="text-base">Campaign Performance</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={campaignPerformance}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Legend />
                <Bar dataKey="leads" fill="#0c4a6e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="qualified" fill="#ca8a04" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
