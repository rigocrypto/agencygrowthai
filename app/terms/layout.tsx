import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Use',
  description: 'Read the AgencyGrowthAI terms of use for this educational financial-services platform.',
  alternates: { canonical: '/terms' },
  openGraph: { title: 'Terms of Use | AgencyGrowthAI', description: 'Read the terms of use for AgencyGrowthAI.', url: '/terms', type: 'website' },
  twitter: { card: 'summary', title: 'Terms of Use | AgencyGrowthAI', description: 'Read the terms of use for AgencyGrowthAI.' },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
