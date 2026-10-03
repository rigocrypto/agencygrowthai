import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Disclaimers',
  description: 'Review AgencyGrowthAI financial education, career, and compliance disclaimers.',
  alternates: { canonical: '/disclaimers' },
  openGraph: { title: 'Disclaimers | AgencyGrowthAI', description: 'Review AgencyGrowthAI educational and compliance disclaimers.', url: '/disclaimers', type: 'website' },
  twitter: { card: 'summary', title: 'Disclaimers | AgencyGrowthAI', description: 'Review AgencyGrowthAI educational and compliance disclaimers.' },
};

export default function DisclaimersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
