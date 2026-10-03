'use client';

import Link from 'next/link';
import {
  TrendingUp, Users, Calendar, Target, BarChart3, ShieldCheck,
  BrainCircuit, ArrowRight, CheckCircle2, UserPlus, FileCheck,
  GraduationCap, Phone, Zap, Workflow, Eye,
} from 'lucide-react';
import { PublicShell } from '@/components/public/public-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function HomePage() {
  return (
    <PublicShell>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-6">
              <ShieldCheck className="mr-1 h-3 w-3" /> Compliance-by-design
            </Badge>
            <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Turn Digital Traffic Into <span className="text-primary">Qualified Financial Conversations</span>
            </h1>
            <p className="mt-6 text-balance text-lg text-muted-foreground sm:text-xl">
              AgencyGrowthAI helps financial-service agencies generate, qualify and manage prospects and
              recruiting candidates through a modern digital growth system.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/login">Request a Demo <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">Explore the Platform</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="border-b border-border/40 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">The Problem</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Most financial-service agencies rely on disconnected tools and manual processes that make growth
              impossible to measure.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Users, title: 'Fragmented Lead Sources', desc: 'Referrals, social media, and ads live in different places with no attribution.' },
              { icon: FileCheck, title: 'Manual Follow-up', desc: 'Spreadsheets and sticky notes mean qualified prospects slip through the cracks.' },
              { icon: Target, title: 'No Lead Qualification', desc: 'Every lead gets the same treatment regardless of intent or readiness.' },
              { icon: UserPlus, title: 'Ad-hoc Recruiting', desc: 'No system to attract, qualify, and track career candidates consistently.' },
            ].map((item) => (
              <Card key={item.title} className="border-border/60">
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                    <item.icon className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <CardTitle className="mt-4 text-lg">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Solution */}
      <section className="border-b border-border/40 bg-muted/20 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">The Solution</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              One digital acquisition system that turns traffic into qualified conversations — for both client
              growth and recruiting.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {[
              { icon: Zap, title: 'Capture', desc: 'Educational landing pages and forms that capture prospect information with consent tracking and UTM attribution.' },
              { icon: BrainCircuit, title: 'Qualify', desc: 'Transparent lead scoring and AI-assisted summaries that classify intent — without making financial recommendations.' },
              { icon: Calendar, title: 'Convert', desc: 'Appointment scheduling, agent assignment, and pipeline tracking from first contact to client outcome.' },
            ].map((item, i) => (
              <Card key={item.title} className="relative border-border/60">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <item.icon className="h-6 w-6 text-primary" />
                    </div>
                    <span className="text-3xl font-bold text-muted-foreground">0{i + 1}</span>
                  </div>
                  <CardTitle className="mt-3">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-b border-border/40 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">How It Works</h2>
            <p className="mt-4 text-lg text-muted-foreground">A clear, repeatable process from traffic to outcome.</p>
          </div>
          <div className="mt-16 flex flex-col items-stretch gap-4 lg:flex-row lg:items-center">
            {[
              { icon: Eye, label: 'Traffic' },
              { icon: FileCheck, label: 'Landing Page' },
              { icon: GraduationCap, label: 'Financial Education' },
              { icon: Target, label: 'Lead Capture' },
              { icon: BrainCircuit, label: 'Lead Scoring' },
              { icon: Calendar, label: 'Appointment' },
              { icon: CheckCircle2, label: 'Client Outcome' },
            ].map((step, i, arr) => (
              <div key={step.label} className="flex items-center gap-4 lg:flex-1">
                <div className="flex flex-1 flex-col items-center text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                    <step.icon className="h-7 w-7 text-primary" />
                  </div>
                  <span className="mt-2 text-sm font-medium">{step.label}</span>
                </div>
                {i < arr.length - 1 && <ArrowRight className="hidden h-5 w-5 text-muted-foreground/40 lg:block" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Client Acquisition Funnel */}
      <section className="border-b border-border/40 bg-muted/20 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Client Acquisition Funnel</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                From first click to signed client, every step is tracked and measurable.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  'Educational financial checkup captures prospect data',
                  'AI lead scoring classifies intent and priority',
                  'Appointments scheduled and assigned to agents',
                  'Pipeline tracked from new lead to client outcome',
                  'Campaign attribution shows which sources convert',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-8">
                <Link href="/financial-checkup">See the Financial Checkup <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle>Funnel Stages</CardTitle>
                <CardDescription>A typical prospect journey</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { stage: 'Visitors', count: 1000, pct: 100 },
                  { stage: 'Checkup Starts', count: 350, pct: 35 },
                  { stage: 'Leads Captured', count: 180, pct: 18 },
                  { stage: 'Qualified', count: 72, pct: 7 },
                  { stage: 'Appointments', count: 45, pct: 4.5 },
                  { stage: 'Clients', count: 18, pct: 1.8 },
                ].map((s) => (
                  <div key={s.stage}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{s.stage}</span>
                      <span className="text-muted-foreground">{s.count}</span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${s.pct}%` }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Recruiting Funnel */}
      <section className="border-b border-border/40 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
            <Card className="order-2 border-border/60 lg:order-1">
              <CardHeader>
                <CardTitle>Recruiting Pipeline</CardTitle>
                <CardDescription>Track candidates from interest to licensed agent</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { stage: 'Career Page Visitors', count: 500 },
                  { stage: 'Interest Forms Submitted', count: 85 },
                  { stage: 'Discovery Calls', count: 32 },
                  { stage: 'Licensing Process', count: 14 },
                  { stage: 'Licensed Agents', count: 8 },
                  { stage: 'Onboarded', count: 6 },
                ].map((s, i, arr) => (
                  <div key={s.stage} className="flex items-center gap-3">
                    <div className="flex-1 rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{s.stage}</span>
                        <Badge variant="secondary">{s.count}</Badge>
                      </div>
                    </div>
                    {i < arr.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground/40" />}
                  </div>
                ))}
              </CardContent>
            </Card>
            <div className="order-1 lg:order-2">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Recruiting Funnel</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Build your agency with a structured recruiting pipeline — from career page visitors to licensed agents.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  'Career landing page with clear opportunity and disclaimers',
                  'Candidate interest form with qualification scoring',
                  'Discovery call scheduling and tracking',
                  'Licensing progress monitoring',
                  'Onboarding pipeline from candidate to active agent',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-8">
                <Link href="/career">Explore the Opportunity <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="border-b border-border/40 bg-muted/20 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Agency Dashboard Preview</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              One dashboard for both client acquisition and recruiting pipelines.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {[
              { label: 'Total Leads', value: '40', icon: Users },
              { label: 'Qualified', value: '15', icon: Target },
              { label: 'Appointments', value: '8', icon: Calendar },
              { label: 'Conversion', value: '20%', icon: TrendingUp },
              { label: 'Candidates', value: '6', icon: UserPlus },
              { label: 'Active Agents', value: '5', icon: Phone },
              { label: 'Campaigns', value: '4', icon: BarChart3 },
              { label: 'Content Assets', value: '3', icon: FileCheck },
            ].map((stat) => (
              <Card key={stat.label} className="border-border/60">
                <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                  <stat.icon className="h-8 w-8 text-primary" />
                  <span className="mt-3 text-2xl font-bold">{stat.value}</span>
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Button asChild size="lg">
              <Link href="/login">View Live Dashboard <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* AI Lead Intelligence */}
      <section className="border-b border-border/40 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <Badge variant="secondary" className="mb-4">
                <BrainCircuit className="mr-1 h-3 w-3" /> AI-Powered
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">AI Lead Intelligence</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                AI assists your team in organizing and understanding the pipeline — without making financial
                recommendations.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  'Summarize lead information and classify intent',
                  'Suggest neutral, educational follow-up topics',
                  'Generate marketing content drafts for compliance review',
                  'Summarize campaign performance and explain metrics',
                  'Every AI output is labeled and requires human review',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <BrainCircuit className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BrainCircuit className="h-5 w-5 text-primary" /> AI Assistant
                </CardTitle>
                <CardDescription>Example lead summary</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                  <p className="text-sm">
                    <span className="font-medium">Michael Anderson</span> is a moderate intent lead interested in
                    retirement planning. Key topics: retirement preparedness gap, family protection review.
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <Badge variant="secondary">Moderate Intent</Badge>
                    <Badge variant="outline">Score: 52</Badge>
                  </div>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    AI-generated draft — requires human/compliance review before publication.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Analytics */}
      <section className="border-b border-border/40 bg-muted/20 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Analytics</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Measure what matters — from lead source to client outcome.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: BarChart3, title: 'Leads by Source', desc: 'See which channels generate the most prospects.' },
              { icon: TrendingUp, title: 'Lead Score Distribution', desc: 'Understand pipeline quality at a glance.' },
              { icon: Calendar, title: 'Appointments Over Time', desc: 'Track scheduling velocity and agent capacity.' },
              { icon: Target, title: 'Conversion Rates', desc: 'Measure lead-to-appointment and appointment-to-client.' },
            ].map((item) => (
              <Card key={item.title} className="border-border/60">
                <CardHeader>
                  <item.icon className="h-8 w-8 text-primary" />
                  <CardTitle className="mt-3 text-base">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance-by-design */}
      <section className="border-b border-border/40 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Workflow className="h-5 w-5 text-primary" /> Content Approval Workflow
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {['Draft', 'Pending Review', 'Approved', 'Published'].map((stage, i, arr) => (
                  <div key={stage} className="flex items-center gap-3">
                    <div className="flex-1 rounded-lg border border-border/60 bg-muted/30 px-4 py-2.5 text-sm font-medium">
                      {stage}
                    </div>
                    {i < arr.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground/40" />}
                  </div>
                ))}
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/30">
                  <p className="text-xs text-red-700 dark:text-red-400">
                    Rejected content returns to: Revision Required
                  </p>
                </div>
              </CardContent>
            </Card>
            <div>
              <Badge variant="secondary" className="mb-4">
                <ShieldCheck className="mr-1 h-3 w-3" /> Compliance-by-design
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Compliance Built In</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Every marketing asset goes through a structured approval workflow. AI-generated content can
                never be automatically published.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  'Content status tracking: Draft, Pending Review, Approved, Published',
                  'Version history with reviewer and approval date',
                  'AI-generated content always requires human review',
                  'Consent tracking on every lead capture form',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 rounded-lg bg-muted/50 p-4 text-xs text-muted-foreground">
                Compliance workflows are organizational controls and do not replace applicable laws, regulations,
                carrier/broker-dealer requirements, or professional review.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-secondary px-8 py-16 text-center text-white">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to Turn Traffic Into Conversations?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/90">
              See how AgencyGrowthAI can transform your agency&apos;s client acquisition and recruiting.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button asChild size="lg" variant="secondary">
                <Link href="/login">Request a Demo <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white">
                <Link href="/financial-checkup">Try the Financial Checkup</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
