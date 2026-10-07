import type { Metadata } from 'next';
import { SITE_OG_IMAGES } from '@/lib/social/site-og-image';

export const metadata: Metadata = {
  title: 'State Election Results',
  description:
    'Browse 2024 state election results: Governor, State Senate, and State House races. Data from MEDSL/Harvard Dataverse.',
  openGraph: {
    images: SITE_OG_IMAGES,
    title: 'State Election Results | CIV.IQ',
    description:
      'Browse 2024 state election results: Governor, State Senate, and State House races. Data from MEDSL/Harvard Dataverse.',
    url: 'https://civdotiq.org/elections/state',
    siteName: 'CIV.IQ',
    type: 'website',
  },
};

export default function StateElectionsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
