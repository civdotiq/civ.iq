import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Enforcement Actions',
  description:
    'Browse federal enforcement actions from EPA, OSHA, SEC, and CFPB. Search by sector, state, or organization.',
  openGraph: {
    title: 'Enforcement Actions | CIV.IQ',
    description:
      'Browse federal enforcement actions from EPA, OSHA, SEC, and CFPB. Search by sector, state, or organization.',
    url: 'https://civdotiq.org/enforcement',
    siteName: 'CIV.IQ',
    type: 'website',
  },
};

export default function EnforcementLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
