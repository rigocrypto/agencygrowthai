'use client';

import { useState } from 'react';
import { BrainCircuit, Send, Loader2, FileText, Users, Target, BarChart3, Sparkles } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { aiProvider, AI_GUARDRAILS } from '@/lib/ai';
import { repo } from '@/lib/repo';
import { AGENCY_CONFIG } from '@/lib/constants';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<{ title: string; content: string } | null>(null);

  const quickActions = [
    { label: 'Summarize latest leads', icon: Users, action: async () => {
      const leads = await repo.getLeads();
      const recent = leads.slice(0, 5);
      const summaries = await Promise.all(recent.map((l) => aiProvider.summarizeLead({
        name: `${l.first_name} ${l.last_name}`,
        interest: l.interest,
        score: l.score,
        status: l.status,
        checkup: l.checkup_responses as Record<string, string> | null,
      })));
      return summaries.map((s, i) => `${recent[i].first_name} ${recent[i].last_name}: ${s.summary}`).join('\n\n');
    }},
    { label: 'Suggest follow-up topics', icon: Target, action: async () => {
      const leads = await repo.getLeads();
      const top = leads.find((l) => l.score >= 70) || leads[0];
      if (!top) return 'No leads to analyze.';
      const topics = await aiProvider.suggestFollowUpTopics({ name: `${top.first_name} ${top.last_name}`, interest: top.interest, status: top.status });
      return `Follow-up topics for ${top.first_name} ${top.last_name}:\n${topics.map((t, i) => `${i + 1}. ${t}`).join('\n')}`;
    }},
    { label: 'Summarize campaign performance', icon: BarChart3, action: async () => {
      const [campaigns, leads] = await Promise.all([repo.getCampaigns(), repo.getLeads()]);
      const c = campaigns[0];
      if (!c) return 'No campaigns to analyze.';
      const cLeads = leads.filter((l) => l.campaign_id === c.id || l.utm_campaign === c.utm_campaign);
      return await aiProvider.summarizeCampaign({
        name: c.name,
        leads: cLeads.length,
        qualified: cLeads.filter((l) => ['qualified', 'appointment', 'client'].includes(l.status)).length,
        appointments: cLeads.filter((l) => ['appointment', 'client'].includes(l.status)).length,
      });
    }},
    { label: 'Draft a social post about retirement', icon: FileText, action: async () => {
      const result = await aiProvider.generateContentDraft({ type: 'social_post', topic: 'Retirement Planning', audience: 'working professionals' });
      setDraft({ title: result.title, content: result.content });
      return `Content draft generated: "${result.title}". See the draft panel below.\n\n${AGENCY_CONFIG.ai_generated_label}`;
    }},
  ];

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg: ChatMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const lower = input.toLowerCase();
      let response = '';

      if (lower.includes('lead') && lower.includes('summar')) {
        const leads = await repo.getLeads();
        const top = leads.slice(0, 3);
        const summaries = await Promise.all(top.map((l) => aiProvider.summarizeLead({
          name: `${l.first_name} ${l.last_name}`,
          interest: l.interest,
          score: l.score,
          status: l.status,
          checkup: l.checkup_responses as Record<string, string> | null,
        })));
        response = summaries.map((s, i) => `${top[i].first_name} ${top[i].last_name}: ${s.summary}`).join('\n\n');
      } else if (lower.includes('candidate')) {
        const candidates = await repo.getCandidates();
        const top = candidates[0];
        if (top) {
          const s = await aiProvider.summarizeCandidate({
            name: `${top.first_name} ${top.last_name}`,
            score: top.score,
            occupation: top.current_occupation,
            experience: top.years_experience,
            why_interested: top.why_interested,
          });
          response = s.summary;
        } else {
          response = 'No candidates to summarize.';
        }
      } else if (lower.includes('metric') || lower.includes('dashboard')) {
        const metrics = await repo.getDashboardMetrics();
        const explanations = await Promise.all(
          Object.entries(metrics).map(([key, value]) => aiProvider.explainMetric(key, value))
        );
        response = explanations.join('\n\n');
      } else if (lower.includes('draft') || lower.includes('content')) {
        const result = await aiProvider.generateContentDraft({ type: 'social_post', topic: 'Financial Wellness', audience: 'families' });
        setDraft({ title: result.title, content: result.content });
        response = `Draft generated: "${result.title}". See the draft panel below.\n\n${AGENCY_CONFIG.ai_generated_label}`;
      } else {
        response = 'I can help you with:\n• Summarizing leads and candidates\n• Suggesting follow-up topics\n• Summarizing campaign performance\n• Explaining dashboard metrics\n• Drafting marketing content (requires compliance review)\n\nTry one of the quick actions below.';
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: response }]);
    } catch {
      toast.error('Could not process request');
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    }
    setLoading(false);
  };

  const handleQuickAction = async (action: () => Promise<string>) => {
    setLoading(true);
    try {
      const result = await action();
      setMessages((prev) => [...prev, { role: 'user', content: 'Quick action' }, { role: 'assistant', content: result }]);
    } catch {
      toast.error('Action failed');
    }
    setLoading(false);
  };

  return (
    <DashboardShell title="AI Assistant" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'AI Assistant' }]}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Chat */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BrainCircuit className="h-5 w-5 text-primary" /> AgencyGrowthAI Assistant
              </CardTitle>
              <CardDescription>Summarize, analyze, and draft — without making financial recommendations</CardDescription>
            </CardHeader>
            <CardContent>
              {messages.length === 0 ? (
                <div className="py-8 text-center">
                  <Sparkles className="mx-auto h-10 w-10 text-muted-foreground/30" />
                  <p className="mt-4 text-sm text-muted-foreground">Ask me anything about your pipeline, or try a quick action.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-lg p-3 text-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="rounded-lg bg-muted p-3"><Loader2 className="h-4 w-4 animate-spin" /></div>
                    </div>
                  )}
                </div>
              )}
              <div className="mt-4 flex gap-2">
                <Textarea rows={2} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about leads, candidates, campaigns..." onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} />
                <Button onClick={handleSend} disabled={loading || !input.trim()} size="icon" className="h-10 w-10">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <Button key={action.label} variant="outline" onClick={() => handleQuickAction(action.action)} disabled={loading} className="justify-start">
                <action.icon className="mr-2 h-4 w-4" /> {action.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Right: Content Draft & Guardrails */}
        <div className="space-y-6">
          {draft && (
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-base">{draft.title}</CardTitle>
                <Badge variant="outline" className="w-fit border-amber-400 text-amber-700">DRAFT</Badge>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">{draft.content}</p>
                <Button asChild size="sm" className="mt-4 w-full">
                  <a href="/dashboard/compliance">Send to Compliance Review</a>
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base">AI Guardrails</CardTitle>
              <CardDescription>The AI must never:</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {AI_GUARDRAILS.map((rule, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="mt-0.5 text-xs text-red-600">✕</span>
                  <span className="text-xs text-muted-foreground">{rule}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
