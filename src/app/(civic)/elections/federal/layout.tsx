import type { Metadata } from 'next';
import { SITE_OG_IMAGES } from '@/lib/social/site-og-image';

export const metadata: Metadata = {
  title: 'Federal Election Results',
  description:
    'Browse 2024 federal election results: President, U.S. Senate, and U.S. House races by state. Data from MEDSL/Harvard Dataverse.',
  openGraph: {
    images: SITE_OG_IMAGES,
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
