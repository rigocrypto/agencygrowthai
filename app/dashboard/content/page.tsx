'use client';

import { useEffect, useState } from 'react';
import { FileText, Plus, Loader2 } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { repo } from '@/lib/repo';
import type { ContentAsset } from '@/lib/types';

export default function ContentPage() {
  const [assets, setAssets] = useState<ContentAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newAsset, setNewAsset] = useState({ title: '', type: 'social_post' as ContentAsset['type'], content: '' });

  useEffect(() => {
    (async () => {
      const a = await repo.getContentAssets();
      setAssets(a);
      setLoading(false);
    })();
  }, []);

  const handleCreate = async () => {
    if (!newAsset.title || !newAsset.content) {
      toast.error('Please enter a title and content');
      return;
    }
    setSubmitting(true);
    try {
      const created = await repo.createContentAsset({
        title: newAsset.title,
        type: newAsset.type,
        content: newAsset.content,
        ai_generated: false,
      });
      setAssets((prev) => [created, ...prev]);
      setDialogOpen(false);
      setNewAsset({ title: '', type: 'social_post', content: '' });
      toast.success('Content asset created as draft');
    } catch {
      toast.error('Could not create content asset');
    }
    setSubmitting(false);
  };

  return (
    <DashboardShell title="Content" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Content' }]}>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Manage marketing and educational content assets.</p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-1 h-4 w-4" /> New Content</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Content Asset</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={newAsset.title} onChange={(e) => setNewAsset({ ...newAsset, title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={newAsset.type} onValueChange={(v) => setNewAsset({ ...newAsset, type: v as ContentAsset['type'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['social_post', 'email', 'educational_article', 'ad_copy', 'landing_page'].map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea rows={6} value={newAsset.content} onChange={(e) => setNewAsset({ ...newAsset, content: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create as Draft'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border/60">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-6">{[...Array(3)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded bg-muted" />)}</div>
          ) : assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/30" />
              <p className="mt-4 text-sm text-muted-foreground">No content assets yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="hidden sm:table-cell">Type</TableHead>
                  <TableHead className="hidden md:table-cell">AI</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-sm font-medium">{a.title}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm capitalize">{a.type.replace(/_/g, ' ')}</TableCell>
                    <TableCell className="hidden md:table-cell">{a.ai_generated ? <Badge variant="secondary">AI</Badge> : <span className="text-sm text-muted-foreground">Manual</span>}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{a.status.replace(/_/g, ' ')}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="mt-4 text-sm text-muted-foreground">
        Content status changes and compliance review happen in the <a href="/dashboard/compliance" className="text-primary hover:underline">Compliance Center</a>.
      </p>
    </DashboardShell>
  );
}
