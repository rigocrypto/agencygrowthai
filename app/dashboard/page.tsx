'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users, Target, Calendar, TrendingUp, UserPlus, Briefcase, Megaphone, ArrowRight,
} from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { repo } from '@/lib/repo';
import { LEAD_SCORE_TIERS } from '@/lib/constants';
import type { DashboardMetrics, Lead, Appointment } from '@/lib/types';

export default function DashboardOverview() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [upcomingAppts, setUpcomingAppts] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [m, leads, appts] = await Promise.all([
        repo.getDashboardMetrics(),
        repo.getLeads(),
        repo.getAppointments(),
      ]);
      setMetrics(m);
      setRecentLeads(leads.slice(0, 5));
      setUpcomingAppts(appts.filter((a) => ['scheduled', 'confirmed', 'requested'].includes(a.status)).slice(0, 5));
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <DashboardShell title="Overview">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(7)].map((_, i) => (
            <Card key={i} className="animate-pulse"><CardContent className="h-28" /></Card>
          ))}
        </div>
      </DashboardShell>
    );
  }

  if (!metrics) return null;

  const cards = [
    { label: 'Total Leads', value: metrics.total_leads, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Qualified Leads', value: metrics.qualified_leads, icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { label: 'Appointments', value: metrics.appointments, icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-100' },
    { label: 'Conversion Rate', value: `${metrics.conversion_rate}%`, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-100' },
    { label: 'Recruiting Candidates', value: metrics.recruiting_candidates, icon: UserPlus, color: 'text-cyan-600', bg: 'bg-cyan-100' },
    { label: 'Active Agents', value: metrics.active_agents, icon: Briefcase, color: 'text-rose-600', bg: 'bg-rose-100' },
    { label: 'Campaign ROI', value: `${metrics.campaign_roi}%`, icon: Megaphone, color: 'text-indigo-600', bg: 'bg-indigo-100' },
  ];

  return (
    <DashboardShell title="Overview" breadcrumbs={[{ label: 'Overview' }]}>
      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label} className="border-border/60">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="mt-1 text-2xl font-bold">{card.value}</p>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${card.bg}`}>
                <card.icon className={`h-6 w-6 ${card.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Leads & Upcoming Appointments */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Leads</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/leads">View all <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentLeads.length === 0 ? (
              <p className="text-sm text-muted-foreground">No leads yet.</p>
            ) : (
              recentLeads.map((lead) => {
                const tier = LEAD_SCORE_TIERS[lead.score_tier];
                return (
                  <Link key={lead.id} href={`/dashboard/leads/${lead.id}`} className="flex items-center justify-between rounded-md border border-border/40 p-3 transition-colors hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                        {lead.first_name.charAt(0)}{lead.last_name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{lead.first_name} {lead.last_name}</p>
                        <p className="text-xs text-muted-foreground">{lead.interest || 'General inquiry'}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={tier.color}>{lead.score}</Badge>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Upcoming Appointments</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/appointments">View all <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingAppts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming appointments.</p>
            ) : (
              upcomingAppts.map((apt) => (
                <Link key={apt.id} href={`/dashboard/appointments`} className="flex items-center justify-between rounded-md border border-border/40 p-3 transition-colors hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{apt.meeting_type}</p>
                      <p className="text-xs text-muted-foreground">{apt.date} at {apt.time}</p>
                    </div>
                  </div>
                  <Badge variant={apt.status === 'confirmed' ? 'default' : 'secondary'}>
                    {apt.status.replace(/_/g, ' ')}
                  </Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/dashboard/ai-assistant" className="group">
          <Card className="border-border/60 transition-colors group-hover:border-primary/40">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">AI Assistant</p>
                <p className="text-xs text-muted-foreground">Summarize leads, draft content</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/compliance" className="group">
          <Card className="border-border/60 transition-colors group-hover:border-primary/40">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">Compliance Center</p>
                <p className="text-xs text-muted-foreground">Review pending content</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/analytics" className="group">
          <Card className="border-border/60 transition-colors group-hover:border-primary/40">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Megaphone className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">Analytics</p>
                <p className="text-xs text-muted-foreground">Track performance</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </DashboardShell>
  );
}
