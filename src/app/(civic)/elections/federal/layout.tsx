import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Federal Election Results',
  description:
    'Browse 2024 federal election results: President, U.S. Senate, and U.S. House races by state. Data from MEDSL/Harvard Dataverse.',
  openGraph: {
    title: 'Federal Election Results | CIV.IQ',
    description:
      'Browse 2024 federal election results: President, U.S. Senate, and U.S. House races by state. Data from MEDSL/Harvard Dataverse.',
    url: 'https://civdotiq.org/elections/federal',
    siteName: 'CIV.IQ',
    type: 'website',
  },
};

export default function FederalElectionsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
