'use client';

import { useEffect, useState, useMemo } from 'react';
import { Megaphone } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { repo } from '@/lib/repo';
import { CAMPAIGN_PLATFORMS } from '@/lib/constants';
import type { Campaign, Lead } from '@/lib/types';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [c, l] = await Promise.all([repo.getCampaigns(), repo.getLeads()]);
      setCampaigns(c);
      setLeads(l);
      setLoading(false);
    })();
  }, []);

  const campaignStats = useMemo(() => {
    const stats: Record<string, { leads: number; qualified: number; appointments: number }> = {};
    campaigns.forEach((c) => {
      const cLeads = leads.filter((l) => l.campaign_id === c.id || l.utm_campaign === c.utm_campaign);
      stats[c.id] = {
        leads: cLeads.length,
        qualified: cLeads.filter((l) => ['qualified', 'appointment', 'client'].includes(l.status)).length,
        appointments: cLeads.filter((l) => ['appointment', 'client'].includes(l.status)).length,
      };
    });
    return stats;
  }, [campaigns, leads]);

  return (
    <DashboardShell title="Campaigns" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Campaigns' }]}>
      <Card className="border-border/60">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-6">{[...Array(3)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded bg-muted" />)}</div>
          ) : campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Megaphone className="h-12 w-12 text-muted-foreground/30" />
              <p className="mt-4 text-sm text-muted-foreground">No campaigns yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead className="hidden sm:table-cell">Platform</TableHead>
                  <TableHead className="hidden md:table-cell">Budget</TableHead>
                  <TableHead>Leads</TableHead>
                  <TableHead className="hidden sm:table-cell">Qualified</TableHead>
                  <TableHead className="hidden lg:table-cell">Appts</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c) => {
                  const stats = campaignStats[c.id] || { leads: 0, qualified: 0, appointments: 0 };
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <p className="text-sm font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.utm_source} / {c.utm_medium}</p>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline" className="capitalize">{c.platform}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">${c.budget?.toLocaleString() || '—'}</TableCell>
                      <TableCell className="text-sm font-medium">{stats.leads}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">{stats.qualified}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">{stats.appointments}</TableCell>
                      <TableCell><Badge variant={c.status === 'active' ? 'default' : 'secondary'} className="capitalize">{c.status}</Badge></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="mt-4 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
        UTM tracking and manually entered campaign data. No paid advertising APIs are connected.
      </p>
    </DashboardShell>
  );
}
