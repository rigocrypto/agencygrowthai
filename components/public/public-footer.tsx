import Link from 'next/link';
import { TrendingUp } from 'lucide-react';

export function PublicFooter() {
  return (
    <footer className="border-t border-border/40 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <TrendingUp className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold">
                AgencyGrowth<span className="text-primary">AI</span>
              </span>
            </div>
            <p className="mt-4 max-w-md text-sm text-muted-foreground">
              A digital growth system for financial-service agencies. Generate, qualify and manage prospects
              and recruiting candidates through one platform.
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              Demo data shown — Horizon Financial Group is a fictional agency for demonstration purposes.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold">Platform</h4>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li><Link href="/financial-checkup" className="hover:text-foreground">Financial Checkup</Link></li>
              <li><Link href="/career" className="hover:text-foreground">Careers</Link></li>
              <li><Link href="/login" className="hover:text-foreground">Agency Dashboard</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold">Legal</h4>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li><Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-foreground">Terms of Service</Link></li>
              <li><Link href="/disclaimers" className="hover:text-foreground">Disclaimers</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-border/40 pt-6 text-center text-xs text-muted-foreground">
          <p>
            AgencyGrowthAI is a technology platform. It does not provide financial, investment, tax, or legal advice.
            Compliance workflows are organizational controls and do not replace applicable laws, regulations, or professional review.
          </p>
          <p className="mt-2">© {new Date().getFullYear()} AgencyGrowthAI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
