import type { Metadata } from 'next';
import { SITE_OG_IMAGES } from '@/lib/social/site-og-image';

export const metadata: Metadata = {
  title: { default: 'Transparency', template: '%s | CIV.IQ' },
  description:
    'CIV.IQ transparency tools: reading level analysis of intelligence outputs and data quality metrics.',
  openGraph: {
    images: SITE_OG_IMAGES,
    title: 'Transparency | CIV.IQ',
    description:
      'CIV.IQ transparency tools: reading level analysis of intelligence outputs and data quality metrics.',
    url: 'https://civdotiq.org/transparency',
    siteName: 'CIV.IQ',
    type: 'website',
  },
};

export default function TransparencyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
