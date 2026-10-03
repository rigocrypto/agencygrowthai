import { PublicShell } from '@/components/public/public-shell';
import { Card, CardContent } from '@/components/ui/card';
import { AGENCY_CONFIG } from '@/lib/constants';

export default function DisclaimersPage() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight">Disclaimers</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: August 14, 2025</p>

        <div className="mt-8 space-y-6">
          <Card className="border-border/60">
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold">Financial Education Disclaimer</h2>
              <p className="mt-2 text-sm text-muted-foreground">{AGENCY_CONFIG.financial_education_disclaimer}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Your answers to any questionnaire indicate areas that may be worth discussing with a properly
                licensed financial professional. The platform does not determine that any specific financial
                product is suitable for you.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold">Career & Compensation Disclaimer</h2>
              <p className="mt-2 text-sm text-muted-foreground">{AGENCY_CONFIG.career_disclaimer}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                We do not advertise guaranteed income, unrealistic earnings, or specific income ranges without
                proper substantiation. This opportunity is an independent-contractor (1099) relationship, not
                employment.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold">Compliance Disclaimer</h2>
              <p className="mt-2 text-sm text-muted-foreground">{AGENCY_CONFIG.compliance_disclaimer}</p>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold">AI-Generated Content</h2>
              <p className="mt-2 text-sm text-muted-foreground">{AGENCY_CONFIG.ai_generated_label}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                AI must not recommend specific insurance, investment, or annuity products. AI must not promise
                returns, guarantee outcomes, or impersonate a licensed financial professional.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </PublicShell>
  );
}
