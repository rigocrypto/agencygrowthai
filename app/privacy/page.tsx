import { PublicShell } from '@/components/public/public-shell';
import { Card, CardContent } from '@/components/ui/card';

export default function PrivacyPage() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: August 14, 2025</p>
        <Card className="mt-8 border-border/60">
          <CardContent className="prose prose-sm max-w-none space-y-4 pt-6 text-muted-foreground">
            <p>This Privacy Policy describes how AgencyGrowthAI and its affiliated agencies collect, use, and protect your personal information.</p>
            <h2 className="text-lg font-semibold text-foreground">Information We Collect</h2>
            <p>We collect information you voluntarily provide through our forms, including: name, email address, phone number, age range, employment status, household income range, financial wellness indicators, and your consent to be contacted.</p>
            <h2 className="text-lg font-semibold text-foreground">How We Use Your Information</h2>
            <p>Your information is used to: provide educational resources, contact you about your financial health snapshot, schedule educational consultations, and track agency performance metrics. We do not sell your personal information to third parties.</p>
            <h2 className="text-lg font-semibold text-foreground">Data Minimization</h2>
            <p>We only collect information necessary for the stated purposes. We do not collect sensitive financial account numbers, Social Security numbers, or detailed financial holdings through this platform.</p>
            <h2 className="text-lg font-semibold text-foreground">Consent</h2>
            <p>We track your consent separately from your other data. You may request removal of your information at any time by contacting the agency directly.</p>
            <h2 className="text-lg font-semibold text-foreground">Your Rights</h2>
            <p>Depending on your state of residence, you may have rights to access, correct, or delete your personal information. Contact us to exercise these rights.</p>
            <h2 className="text-lg font-semibold text-foreground">Compliance Note</h2>
            <p>This privacy policy is a placeholder for the MVP demonstration. A production deployment requires review by a qualified privacy attorney to ensure compliance with applicable state and federal regulations, including but not limited to CCPA, CPRA, GLBA, and state insurance regulations.</p>
          </CardContent>
        </Card>
      </div>
    </PublicShell>
  );
}
