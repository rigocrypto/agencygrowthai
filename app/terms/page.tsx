import { PublicShell } from '@/components/public/public-shell';
import { Card, CardContent } from '@/components/ui/card';

export default function TermsPage() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: August 14, 2025</p>
        <Card className="mt-8 border-border/60">
          <CardContent className="prose prose-sm max-w-none space-y-4 pt-6 text-muted-foreground">
            <p>These Terms of Service govern your use of the AgencyGrowthAI platform.</p>
            <h2 className="text-lg font-semibold text-foreground">Educational Purpose</h2>
            <p>The information provided through this platform is for educational purposes only and is not individualized financial, investment, tax, or legal advice. It does not constitute a recommendation to purchase any specific insurance, investment, or annuity product.</p>
            <h2 className="text-lg font-semibold text-foreground">No Guarantee of Results</h2>
            <p>The platform does not guarantee any financial outcome, investment return, retirement result, or income level. All financial decisions involve risk and should be made in consultation with a properly licensed professional.</p>
            <h2 className="text-lg font-semibold text-foreground">Independent-Contractor Relationships</h2>
            <p>Career opportunities described on this platform are independent-contractor opportunities, not offers of employment. Earnings depend on individual effort, market conditions, and applicable licensing. No income is guaranteed.</p>
            <h2 className="text-lg font-semibold text-foreground">AI-Generated Content</h2>
            <p>AI-assisted content is labeled as drafts and requires human and compliance review before publication. The platform never automatically publishes AI-generated financial marketing content.</p>
            <h2 className="text-lg font-semibold text-foreground">Compliance Disclaimer</h2>
            <p>Compliance workflows provided by the platform are organizational controls and do not replace applicable laws, regulations, carrier/broker-dealer requirements, or professional review.</p>
            <h2 className="text-lg font-semibold text-foreground">Placeholder Notice</h2>
            <p>This terms document is a placeholder for the MVP demonstration. A production deployment requires review by a qualified attorney.</p>
          </CardContent>
        </Card>
      </div>
    </PublicShell>
  );
}
