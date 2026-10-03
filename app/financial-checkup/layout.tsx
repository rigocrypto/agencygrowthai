import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Financial Checkup',
  description: 'Complete an educational financial checkup and receive a personalized snapshot to discuss with a licensed professional.',
  alternates: { canonical: '/financial-checkup' },
  openGraph: { title: 'Financial Checkup | AgencyGrowthAI', description: 'Complete an educational financial checkup and receive a personalized snapshot.', url: '/financial-checkup', type: 'website' },
  twitter: { card: 'summary_large_image', title: 'Financial Checkup | AgencyGrowthAI', description: 'Complete an educational financial checkup and receive a personalized snapshot.' },
};

export default function FinancialCheckupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
