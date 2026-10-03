'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Users, ArrowRight } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { repo } from '@/lib/repo';
import { LEAD_STATUSES, LEAD_SCORE_TIERS, scoreTier } from '@/lib/constants';
import type { Lead, Agent } from '@/lib/types';

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');

  useEffect(() => {
    (async () => {
      const [l, a] = await Promise.all([repo.getLeads(), repo.getAgents()]);
      setLeads(l);
      setAgents(a);
      setLoading(false);
    })();
  }, []);

  const agentMap = useMemo(() => {
    const map: Record<string, string> = {};
    agents.forEach((a) => { map[a.id] = `${a.first_name} ${a.last_name}`; });
    return map;
  }, [agents]);

  const sources = useMemo(() => {
    return Array.from(new Set(leads.map((l) => l.source)));
  }, [leads]);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (search && !`${l.first_name} ${l.last_name} ${l.email}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== 'all' && l.status !== statusFilter) return false;
      if (tierFilter !== 'all' && l.score_tier !== tierFilter) return false;
      if (sourceFilter !== 'all' && l.source !== sourceFilter) return false;
      return true;
    });
  }, [leads, search, statusFilter, tierFilter, sourceFilter]);

  return (
    <DashboardShell title="Leads" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Leads' }]}>
      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {LEAD_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={tierFilter} onValueChange={setTierFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Score Tier" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            {Object.entries(LEAD_SCORE_TIERS).map(([key, tier]) => <SelectItem key={key} value={key}>{tier.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Source" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {sources.map((s) => <SelectItem key={s} value={s}>{s.replace(/\b\w/g, (c) => c.toUpperCase())}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-border/60">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-6">
              {[...Array(5)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded bg-muted" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-12 w-12 text-muted-foreground/30" />
              <p className="mt-4 text-sm text-muted-foreground">No leads match your filters.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Source</TableHead>
                  <TableHead className="hidden lg:table-cell">Interest</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Agent</TableHead>
                  <TableHead className="hidden lg:table-cell">Created</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((lead) => {
                  const tier = LEAD_SCORE_TIERS[lead.score_tier];
                  return (
                    <TableRow key={lead.id} className="cursor-pointer" onClick={() => window.location.href = `/dashboard/leads/${lead.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                            {lead.first_name.charAt(0)}{lead.last_name.charAt(0)}
                          </div>
                          <span className="text-sm font-medium">{lead.first_name} {lead.last_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline" className="capitalize">{lead.source}</Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{lead.interest || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={tier.color}>{lead.score}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">{lead.status}</Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {lead.assigned_agent_id ? agentMap[lead.assigned_agent_id] || '—' : 'Unassigned'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Link href={`/dashboard/leads/${lead.id}`} aria-label={`View ${lead.first_name} ${lead.last_name}`} onClick={(e) => e.stopPropagation()}>
                          <ArrowRight className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="mt-4 text-sm text-muted-foreground">{filtered.length} of {leads.length} leads</p>
    </DashboardShell>
  );
}
