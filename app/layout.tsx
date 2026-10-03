import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/components/providers/auth-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://agencygrowthai.example'),
  alternates: { canonical: '/' },
  title: {
    default: 'AgencyGrowthAI — Turn Digital Traffic Into Qualified Financial Conversations',
    template: '%s | AgencyGrowthAI',
  },
  description:
    'AgencyGrowthAI helps financial-service agencies generate, qualify and manage prospects and recruiting candidates through a modern digital growth system.',
  keywords: [
    'financial services agency', 'lead generation', 'financial advisor leads',
    'insurance agent recruiting', 'financial checkup', 'retirement planning education',
    'life insurance education', 'financial services career', 'agency growth',
  ],
  authors: [{ name: 'AgencyGrowthAI' }],
  creator: 'AgencyGrowthAI',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://agencygrowthai.example',
    siteName: 'AgencyGrowthAI',
    title: 'AgencyGrowthAI — Turn Digital Traffic Into Qualified Financial Conversations',
    description: 'Generate, qualify and manage prospects and recruiting candidates through a modern digital growth system.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AgencyGrowthAI — Turn Digital Traffic Into Qualified Financial Conversations',
    description: 'Generate, qualify and manage prospects and recruiting candidates through a modern digital growth system.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'AgencyGrowthAI',
    description: 'A digital growth system for financial-service agencies.',
    url: 'https://agencygrowthai.example',
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
