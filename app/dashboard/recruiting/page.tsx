'use client';

import { useEffect, useState, useMemo } from 'react';
import { UserPlus, Search } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { repo } from '@/lib/repo';
import { CANDIDATE_STATUSES } from '@/lib/constants';
import type { Candidate } from '@/lib/types';

export default function RecruitingPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    (async () => {
      const c = await repo.getCandidates();
      setCandidates(c);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    return candidates.filter((c) => {
      if (search && !`${c.first_name} ${c.last_name} ${c.email} ${c.current_occupation}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      return true;
    });
  }, [candidates, search, statusFilter]);

  const handleStatusChange = async (id: string, status: string) => {
    const updated = await repo.updateCandidate(id, { status: status as Candidate['status'] });
    if (updated) {
      setCandidates((prev) => prev.map((c) => c.id === id ? updated : c));
    }
  };

  return (
    <DashboardShell title="Recruiting" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Recruiting' }]}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search candidates..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {CANDIDATE_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="border-border/60">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-6">{[...Array(4)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded bg-muted" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <UserPlus className="h-12 w-12 text-muted-foreground/30" />
              <p className="mt-4 text-sm text-muted-foreground">No candidates match your filters.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead className="hidden md:table-cell">Occupation</TableHead>
                  <TableHead className="hidden lg:table-cell">Experience</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                          {c.first_name.charAt(0)}{c.last_name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{c.first_name} {c.last_name}</p>
                          <p className="text-xs text-muted-foreground">{c.state}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{c.current_occupation}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{c.years_experience} years</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={c.score} className="w-16 h-2" />
                        <span className="text-xs font-medium">{c.score}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select value={c.status} onValueChange={(v) => handleStatusChange(c.id, v)}>
                        <SelectTrigger aria-label={`Candidate status for ${c.first_name} ${c.last_name}`} className="w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CANDIDATE_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
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
      <p className="mt-4 text-sm text-muted-foreground">{filtered.length} of {candidates.length} candidates</p>
    </DashboardShell>
  );
}
