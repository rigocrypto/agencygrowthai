'use client';

import { useEffect, useState, useMemo } from 'react';
import { Briefcase, Mail, Phone, BadgeCheck } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { repo } from '@/lib/repo';
import { ROLES } from '@/lib/constants';
import type { Agent, Lead } from '@/lib/types';

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [a, l] = await Promise.all([repo.getAgents(), repo.getLeads()]);
      setAgents(a);
      setLeads(l);
      setLoading(false);
    })();
  }, []);

  const agentStats = useMemo(() => {
    const stats: Record<string, { leads: number; appointments: number; conversion: number }> = {};
    agents.forEach((a) => {
      const assignedLeads = leads.filter((l) => l.assigned_agent_id === a.id);
      const appts = assignedLeads.filter((l) => ['appointment', 'client'].includes(l.status));
      stats[a.id] = {
        leads: assignedLeads.length,
        appointments: appts.length,
        conversion: assignedLeads.length > 0 ? Math.round((appts.length / assignedLeads.length) * 100) : 0,
      };
    });
    return stats;
  }, [agents, leads]);

  return (
    <DashboardShell title="Agents" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Agents' }]}>
      <Card className="border-border/60">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-6">{[...Array(3)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded bg-muted" />)}</div>
          ) : agents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Briefcase className="h-12 w-12 text-muted-foreground/30" />
              <p className="mt-4 text-sm text-muted-foreground">No agents yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead className="hidden sm:table-cell">Role</TableHead>
                  <TableHead className="hidden md:table-cell">License</TableHead>
                  <TableHead>Leads</TableHead>
                  <TableHead className="hidden sm:table-cell">Appts</TableHead>
                  <TableHead>Conv.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((a) => {
                  const stats = agentStats[a.id] || { leads: 0, appointments: 0, conversion: 0 };
                  return (
                    <TableRow key={a.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                            {a.first_name.charAt(0)}{a.last_name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{a.first_name} {a.last_name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" /> {a.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline">{a.role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant={a.license_status === 'licensed' ? 'default' : 'secondary'} className="flex items-center gap-1 w-fit">
                          {a.license_status === 'licensed' && <BadgeCheck className="h-3 w-3" />}
                          {a.license_status.replace(/\b\w/g, (c) => c.toUpperCase())}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-medium">{stats.leads}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">{stats.appointments}</TableCell>
                      <TableCell className="text-sm font-medium">{stats.conversion}%</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
