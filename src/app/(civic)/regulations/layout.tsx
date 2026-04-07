import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Federal Regulations',
  description:
    'Search and browse federal regulations from the Federal Register. Filter by agency, type, and date.',
  openGraph: {
    title: 'Federal Regulations | CIV.IQ',
    description:
      'Search and browse federal regulations from the Federal Register. Filter by agency, type, and date.',
    url: 'https://civdotiq.org/regulations',
    siteName: 'CIV.IQ',
    type: 'website',
  },
};

export default function RegulationsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
