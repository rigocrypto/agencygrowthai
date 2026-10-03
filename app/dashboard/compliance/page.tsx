'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck, FileText, ArrowRight, Loader2 } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { repo } from '@/lib/repo';
import { CONTENT_STATUSES, AGENCY_CONFIG } from '@/lib/constants';
import { aiProvider } from '@/lib/ai';
import type { ContentAsset, ContentStatus } from '@/lib/types';

// Radix hands back a plain string; validate it against the known statuses rather than
// asserting the type away — this is the Compliance Center's status field.
const isContentStatus = (value: string): value is ContentStatus =>
  CONTENT_STATUSES.some((s) => s.value === value);

const statusColors: Record<string, string> = {
  draft: 'border-slate-400 text-slate-600',
  pending_review: 'border-amber-400 text-amber-600',
  approved: 'border-emerald-400 text-emerald-600',
  published: 'border-blue-400 text-blue-600',
  rejected: 'border-red-400 text-red-600',
  archived: 'border-muted-foreground text-muted-foreground',
};

const workflowOrder = ['draft', 'pending_review', 'approved', 'published'];

export default function CompliancePage() {
  const [assets, setAssets] = useState<ContentAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newContent, setNewContent] = useState({ title: '', type: 'social_post' as ContentAsset['type'], topic: '', audience: 'general audience' });

  useEffect(() => {
    (async () => {
      const a = await repo.getContentAssets();
      setAssets(a);
      setLoading(false);
    })();
  }, []);

  const handleStatusChange = async (id: string, status: ContentStatus) => {
    const updated = await repo.updateContentStatus(id, status);
    if (updated) {
      setAssets((prev) => prev.map((a) => a.id === id ? updated : a));
      toast.success(`Content status updated to ${status.replace(/_/g, ' ')}`);
    }
  };

  const handleCreateDraft = async () => {
    if (!newContent.title || !newContent.topic) {
      toast.error('Please enter a title and topic');
      return;
    }
    setSubmitting(true);
    try {
      const draft = await aiProvider.generateContentDraft({
        type: newContent.type === 'educational_article' ? 'educational_article' : newContent.type === 'email' ? 'email' : 'social_post',
        topic: newContent.topic,
        audience: newContent.audience,
      });
      const created = await repo.createContentAsset({
        title: newContent.title,
        type: newContent.type,
        content: draft.content,
        ai_generated: true,
      });
      setAssets((prev) => [created, ...prev]);
      setDialogOpen(false);
      setNewContent({ title: '', type: 'social_post', topic: '', audience: 'general audience' });
      toast.success('AI draft created — pending compliance review');
    } catch {
      toast.error('Could not create draft');
    }
    setSubmitting(false);
  };

  const pendingCount = assets.filter((a) => a.status === 'pending_review').length;
  const draftCount = assets.filter((a) => a.status === 'draft').length;
  const approvedCount = assets.filter((a) => a.status === 'approved').length;
  const publishedCount = assets.filter((a) => a.status === 'published').length;

  return (
    <DashboardShell title="Compliance Center" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Compliance' }]}>
      {/* Workflow Visualization */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {workflowOrder.map((stage, i) => (
          <div key={stage} className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize border-primary/40 text-primary">{stage.replace(/_/g, ' ')}</Badge>
            {i < workflowOrder.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground/40" />}
          </div>
        ))}
        <span className="ml-2 text-xs text-muted-foreground">Rejected → Revision Required</span>
      </div>

      {/* Status Summary */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Drafts', value: draftCount, color: 'text-slate-600' },
          { label: 'Pending Review', value: pendingCount, color: 'text-amber-600' },
          { label: 'Approved', value: approvedCount, color: 'text-emerald-600' },
          { label: 'Published', value: publishedCount, color: 'text-blue-600' },
        ].map((s) => (
          <Card key={s.label} className="border-border/60">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">All marketing assets must go through the approval workflow.</p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><FileText className="mr-1 h-4 w-4" /> Create AI Draft</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create AI Content Draft</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={newContent.title} onChange={(e) => setNewContent({ ...newContent, title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Content Type</Label>
                <Select value={newContent.type} onValueChange={(v) => setNewContent({ ...newContent, type: v as ContentAsset['type'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['social_post', 'email', 'educational_article', 'ad_copy', 'landing_page'].map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Topic</Label>
                <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={newContent.topic} onChange={(e) => setNewContent({ ...newContent, topic: e.target.value })} placeholder="e.g. Retirement Planning" />
              </div>
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
                <p className="text-xs text-amber-700 dark:text-amber-400">{AGENCY_CONFIG.ai_generated_label}</p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateDraft} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generate Draft'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Content Assets Table */}
      <Card className="border-border/60">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-6">{[...Array(3)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded bg-muted" />)}</div>
          ) : assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ShieldCheck className="h-12 w-12 text-muted-foreground/30" />
              <p className="mt-4 text-sm text-muted-foreground">No content assets yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="hidden sm:table-cell">Type</TableHead>
                  <TableHead className="hidden md:table-cell">AI</TableHead>
                  <TableHead className="hidden sm:table-cell">Version</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <p className="text-sm font-medium">{a.title}</p>
                      {a.ai_generated && <Badge variant="outline" className="mt-1 text-xs">AI-generated</Badge>}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm capitalize">{a.type.replace(/_/g, ' ')}</TableCell>
                    <TableCell className="hidden md:table-cell">{a.ai_generated ? <Badge variant="secondary">Yes</Badge> : <span className="text-sm text-muted-foreground">No</span>}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">v{a.version}</TableCell>
                    <TableCell>
                      <Select
                        value={a.status}
                        onValueChange={(v) => {
                          if (isContentStatus(v)) handleStatusChange(a.id, v);
                        }}
                      >
                        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CONTENT_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
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

      {/* Disclaimer */}
      <div className="mt-6 rounded-lg bg-muted/50 p-4">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">{AGENCY_CONFIG.compliance_disclaimer}</p>
        </div>
      </div>
    </DashboardShell>
  );
}
