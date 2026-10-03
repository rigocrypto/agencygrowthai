import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Read the AgencyGrowthAI privacy policy and learn how information is handled.',
  alternates: { canonical: '/privacy' },
  openGraph: { title: 'Privacy Policy | AgencyGrowthAI', description: 'Learn how AgencyGrowthAI handles information.', url: '/privacy', type: 'website' },
  twitter: { card: 'summary', title: 'Privacy Policy | AgencyGrowthAI', description: 'Learn how AgencyGrowthAI handles information.' },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
