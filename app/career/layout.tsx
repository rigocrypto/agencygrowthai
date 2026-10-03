import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Financial Services Career Opportunities',
  description: 'Explore an independent-contractor career opportunity in financial services with training and mentorship.',
  alternates: { canonical: '/career' },
  openGraph: { title: 'Financial Services Career Opportunities | AgencyGrowthAI', description: 'Explore an independent-contractor career opportunity in financial services.', url: '/career', type: 'website' },
  twitter: { card: 'summary_large_image', title: 'Financial Services Career Opportunities | AgencyGrowthAI', description: 'Explore an independent-contractor career opportunity in financial services.' },
};

export default function CareerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
