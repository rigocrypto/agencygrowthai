'use client';

import { useEffect, useState } from 'react';
import { Settings as SettingsIcon, ShieldCheck, Brain } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { dataMode } from '@/lib/repo';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { isNhostConfigured } from '@/lib/nhost/client';
import { calendarProvider } from '@/lib/integrations/calendar';
import { AGENCY_CONFIG, LEAD_SCORE_TIERS } from '@/lib/constants';
import { useAuth } from '@/components/providers/auth-provider';

export default function SettingsPage() {
  const { user, isDemo } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <DashboardShell title="Settings" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Settings' }]}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Agency Configuration */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Agency Configuration</CardTitle>
            <CardDescription>Tenant-level settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row label="Agency Name" value={AGENCY_CONFIG.name} />
            <Row label="Domain" value={AGENCY_CONFIG.domain} />
            <Row label="Contact Email" value={AGENCY_CONFIG.contact_email} />
            <Row label="Contact Phone" value={AGENCY_CONFIG.contact_phone} />
            <Separator />
            <Row label="Primary Color" value={AGENCY_CONFIG.primary_color} />
            <Row label="Secondary Color" value={AGENCY_CONFIG.secondary_color} />
          </CardContent>
        </Card>

        {/* Integrations Status */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Integrations</CardTitle>
            <CardDescription>Connection status for external services</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <IntegrationRow label="Supabase Database" connected={isSupabaseConfigured} />
            <IntegrationRow label="Supabase Auth" connected={isSupabaseConfigured} />
            <IntegrationRow label="Nhost Auth + GraphQL" connected={isNhostConfigured} />
            <IntegrationRow label="Calendar Provider" connected={calendarProvider.connected} name={calendarProvider.name} />
            <IntegrationRow label="AI Provider" connected={false} name="Demo AI Engine (NOT CONNECTED)" />
            <IntegrationRow label="Email Provider" connected={false} name="Not configured" />
            <IntegrationRow label="SMS Provider" connected={false} name="Not configured" />
            <IntegrationRow label="Payment Provider" connected={false} name="Not configured" />
          </CardContent>
        </Card>

        {/* Lead Scoring Rules */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Lead Scoring Tiers</CardTitle>
            <CardDescription>Transparent, configurable scoring rules</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(LEAD_SCORE_TIERS).map(([key, tier]) => (
              <div key={key} className="flex items-center justify-between rounded-md border border-border/40 p-3">
                <div>
                  <p className="text-sm font-medium">{tier.label}</p>
                  <p className="text-xs text-muted-foreground">Score range: {tier.min}–{tier.max}</p>
                </div>
                <Badge variant="outline" className={tier.color}>{key}</Badge>
              </div>
            ))}
            <p className="mt-2 text-xs text-muted-foreground">
              Scoring is based on transparent rules (income, age, savings, goals, dependents, consent).
              AI classifies intent but does not make financial recommendations.
            </p>
          </CardContent>
        </Card>

        {/* Security & Compliance */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Security & Compliance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row label="Authentication" value={isDemo ? 'DEMO MODE (session)' : dataMode === 'nhost' ? 'Nhost Auth' : 'Supabase Auth'} />
            <Row label="Tenant Isolation" value={dataMode === 'nhost' ? 'Nhost JWT + Hasura permissions' : 'agency_id + RLS policies'} />
            <Row label="Role-Based Access" value="Owner, Admin, Agent, Marketing" />
            <Row label="Consent Tracking" value="Enabled" />
            <Row label="Audit Logging" value="Enabled" />
            <Row label="AI Content Publishing" value="Blocked (requires human review)" />
            <Separator />
            <div className="rounded-md bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">{AGENCY_CONFIG.compliance_disclaimer}</p>
            </div>
          </CardContent>
        </Card>

        {/* Account */}
        {mounted && user && (
          <Card className="border-border/60 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><SettingsIcon className="h-4 w-4 text-primary" /> Your Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Row label="Name" value={`${user.first_name} ${user.last_name}`} />
              <Row label="Email" value={user.email} />
              <Row label="Role" value={user.role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} />
              <Row label="Agency ID" value={user.agency_id || 'Resolved by Hasura membership'} />
              <Row label="Mode" value={isDemo ? 'Demo (no production auth)' : 'Production'} />
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function IntegrationRow({ label, connected, name }: { label: string; connected: boolean; name?: string }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {name && <p className="text-xs text-muted-foreground">{name}</p>}
      </div>
      <Badge variant={connected ? 'default' : 'outline'} className={connected ? '' : 'border-amber-400 text-amber-600'}>
        {connected ? 'Connected' : 'DEMO / NOT CONNECTED'}
      </Badge>
    </div>
  );
}
