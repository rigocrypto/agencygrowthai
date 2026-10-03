'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import {
  Briefcase, ArrowRight, ArrowLeft, CheckCircle2, Loader2,
  GraduationCap, Award, Users, TrendingUp, ShieldCheck,
} from 'lucide-react';
import { PublicShell } from '@/components/public/public-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from 'sonner';
import { isNhostMode, repo } from '@/lib/repo';
import { createPublicCandidate } from '@/lib/public-intake';
import { AGENCY_CONFIG } from '@/lib/constants';

export default function CareerPage() {
  const [step, setStep] = useState<'info' | 'form' | 'success'>('info');
  const [submitting, setSubmitting] = useState(false);
  const candidateIdempotencyKeyRef = useRef<string | null>(null);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    state: '',
    current_occupation: '',
    years_experience: '',
    why_interested: '',
    sales_experience: '',
    financial_services_experience: '',
    preferred_contact: '',
  });

  const canSubmit =
    form.first_name && form.last_name && form.email && form.phone &&
    form.state && form.current_occupation && form.years_experience &&
    form.why_interested && form.sales_experience && form.financial_services_experience && form.preferred_contact;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      toast.error('Please complete all fields');
      return;
    }
    setSubmitting(true);
    try {
      const candidateInput = {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone,
        state: form.state,
        current_occupation: form.current_occupation,
        years_experience: form.years_experience,
        why_interested: form.why_interested,
        sales_experience: form.sales_experience,
        financial_services_experience: form.financial_services_experience,
        preferred_contact: form.preferred_contact,
      };
      if (!candidateIdempotencyKeyRef.current) candidateIdempotencyKeyRef.current = crypto.randomUUID();
      if (isNhostMode) await createPublicCandidate(candidateInput, candidateIdempotencyKeyRef.current);
      else await repo.createCandidate(candidateInput);
      toast.success('Application submitted successfully!');
      setStep('success');
    } catch {
      toast.error('Something went wrong. Please try again.');
    }
    setSubmitting(false);
  };

  return (
    <PublicShell>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-6">
              <Briefcase className="mr-1 h-3 w-3" /> Career Opportunity
            </Badge>
            <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
              Build a Career in <span className="text-primary">Financial Services</span>
            </h1>
            <p className="mt-6 text-balance text-lg text-muted-foreground sm:text-xl">
              Learn about licensing, financial education, client development and building an independent
              financial-services business.
            </p>
            <div className="mt-8">
              <Button asChild size="lg">
                <Link href="#apply">Explore the Opportunity <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* What it is / What it is not */}
      <section className="border-b border-border/40 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <Card className="border-emerald-200/60">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                </div>
                <CardTitle className="mt-4">What This Opportunity Is</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {[
                    'An independent-contractor opportunity to build your own financial-services business',
                    'Comprehensive training in financial education, products, and client development',
                    'Support through the licensing process (life, health, and securities where applicable)',
                    'Mentorship from experienced financial professionals',
                    'Flexible schedule and entrepreneurial growth potential',
                    'Access to a modern digital lead generation system',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-red-200/60">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-100">
                  <ShieldCheck className="h-6 w-6 text-red-600" />
                </div>
                <CardTitle className="mt-4">What This Opportunity Is Not</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {[
                    'It is NOT a guarantee of income or earnings',
                    'It is NOT employment — this is an independent-contractor (1099) relationship',
                    'It is NOT a get-rich-quick scheme',
                    'It does NOT guarantee specific results — earnings depend on individual effort, market conditions, and licensing',
                    'It is NOT a salaried position with benefits',
                    'It does NOT replace professional financial, tax, or legal advice',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm">
                      <span className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600">✕</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Licensing & Training */}
      <section className="border-b border-border/40 bg-muted/20 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Licensing & Training Process</h2>
            <p className="mt-4 text-lg text-muted-foreground">A structured path from interest to licensed professional.</p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: GraduationCap, title: '1. Education', desc: 'Complete pre-licensing education requirements for your state.' },
              { icon: Award, title: '2. Licensing Exam', desc: 'Pass the state insurance exam and any required securities exams.' },
              { icon: Users, title: '3. Mentorship', desc: 'Work alongside experienced agents to develop client development skills.' },
              { icon: TrendingUp, title: '4. Build Your Practice', desc: 'Begin building your independent client base with agency support.' },
            ].map((step) => (
              <Card key={step.title} className="border-border/60">
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <step.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="mt-3 text-lg">{step.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Compensation Disclaimer */}
      <section className="border-b border-border/40 py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950/30">
            <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-400">Compensation & Employment Disclaimer</h3>
            <p className="mt-2 text-sm text-amber-800 dark:text-amber-500">{AGENCY_CONFIG.career_disclaimer}</p>
            <p className="mt-2 text-sm text-amber-800 dark:text-amber-500">
              This is an independent-contractor opportunity. You are responsible for your own taxes, benefits, and business expenses.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-b border-border/40 py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="mt-8">
            {[
              { q: 'Do I need prior experience in financial services?', a: 'No prior financial-services experience is required, though it can be helpful. We provide training and support through the licensing process. What matters most is your willingness to learn, commitment to serving clients, and entrepreneurial drive.' },
              { q: 'How long does the licensing process take?', a: 'The timeline varies by state and your availability to study, but typically ranges from 4 to 12 weeks from starting pre-licensing education to receiving your license. We support you throughout the process.' },
              { q: 'What are the upfront costs?', a: 'Costs vary by state and may include pre-licensing education, exam fees, and licensing fees. We will provide a transparent overview of expected costs before you begin. This is an investment in your professional development.' },
              { q: 'Is this a full-time or part-time opportunity?', a: 'The independent-contractor model allows for flexibility. Some agents build their practice full-time, while others start part-time while maintaining another position. Your commitment level affects your potential results.' },
              { q: 'What kind of training is provided?', a: 'Training includes financial education, product knowledge, client development skills, compliance procedures, and access to a digital lead generation system. Ongoing mentorship from experienced agents is a core part of the program.' },
              { q: 'Are earnings guaranteed?', a: 'No. Earnings depend entirely on individual effort, market conditions, and successful licensing. We do not guarantee any level of income. This is an entrepreneurial opportunity, not a salaried position.' },
            ].map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Application Form / Success */}
      <section id="apply" className="py-20">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          {step === 'info' && (
            <Card className="border-border/60">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Career Interest Form</CardTitle>
                <CardDescription>Tell us about yourself and we&apos;ll be in touch.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
                  <p className="text-sm text-amber-800 dark:text-amber-400">
                    By submitting this form, you acknowledge that this is an independent-contractor opportunity,
                    not an offer of employment. No income is guaranteed. Earnings depend on individual effort,
                    market conditions, and applicable licensing.
                  </p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="c_first">First name *</Label>
                      <Input id="c_first" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="c_last">Last name *</Label>
                      <Input id="c_last" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="c_email">Email *</Label>
                      <Input id="c_email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="c_phone">Phone *</Label>
                      <Input id="c_phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="c_state">State *</Label>
                    <Input id="c_state" placeholder="e.g. TX" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="c_occupation">Current occupation *</Label>
                    <Input id="c_occupation" value={form.current_occupation} onChange={(e) => setForm({ ...form, current_occupation: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="c_years">Years of professional experience *</Label>
                    <Select value={form.years_experience} onValueChange={(v) => setForm({ ...form, years_experience: v })}>
                      <SelectTrigger id="c_years"><SelectValue placeholder="Select range" /></SelectTrigger>
                      <SelectContent>
                        {['0-2', '3-5', '6-10', '10+'].map((v) => <SelectItem key={v} value={v}>{v} years</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="c_interest">Why are you interested? *</Label>
                    <Textarea id="c_interest" rows={3} value={form.why_interested} onChange={(e) => setForm({ ...form, why_interested: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="c_sales">Sales experience *</Label>
                      <Select value={form.sales_experience} onValueChange={(v) => setForm({ ...form, sales_experience: v })}>
                        <SelectTrigger id="c_sales"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {['none', 'some', 'extensive'].map((v) => <SelectItem key={v} value={v}>{v.replace(/\b\w/g, (c) => c.toUpperCase())}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="c_financial">Financial-services experience *</Label>
                      <Select value={form.financial_services_experience} onValueChange={(v) => setForm({ ...form, financial_services_experience: v })}>
                        <SelectTrigger id="c_financial"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {['none', 'some', 'extensive'].map((v) => <SelectItem key={v} value={v}>{v.replace(/\b\w/g, (c) => c.toUpperCase())}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="c_contact">Preferred contact method *</Label>
                    <Select value={form.preferred_contact} onValueChange={(v) => setForm({ ...form, preferred_contact: v })}>
                      <SelectTrigger id="c_contact"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {['phone', 'email', 'text', 'video'].map((v) => <SelectItem key={v} value={v}>{v.replace(/\b\w/g, (c) => c.toUpperCase())}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full" disabled={!canSubmit || submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Submit Application <ArrowRight className="ml-2 h-4 w-4" /></>}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {step === 'success' && (
            <Card className="border-border/60 text-center">
              <CardHeader>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                </div>
                <CardTitle className="mt-4 text-2xl">Application Received!</CardTitle>
                <CardDescription>Thank you, {form.first_name}. We&apos;ll review your information and reach out soon.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Your interest form has been submitted to {AGENCY_CONFIG.name}. A team member will contact you
                  at {form.email} to discuss next steps.
                </p>
                <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Button asChild variant="outline"><Link href="/">Back to Home</Link></Button>
                  <Button asChild><Link href="/financial-checkup">Try the Financial Checkup</Link></Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </PublicShell>
  );
}
