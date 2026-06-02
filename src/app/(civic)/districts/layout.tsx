import type { Metadata } from 'next';
import { BreadcrumbSchema, CollectionPageSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Congressional Districts',
  description:
    'Browse all 435 U.S. congressional districts with demographics, spending data, and representative profiles.',
  openGraph: {
    title: 'Congressional Districts | CIV.IQ',
    description:
      'Browse all 435 U.S. congressional districts with demographics, spending data, and representative profiles.',
    url: 'https://civdotiq.org/districts',
    siteName: 'CIV.IQ',
    type: 'website',
  },
};

export default function DistrictsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Districts', url: 'https://civdotiq.org/districts' },
        ]}
      />
      <CollectionPageSchema
        name="Congressional Districts"
        description="Browse all 435 U.S. congressional districts with demographics, spending data, and representative profiles."
        url="https://civdotiq.org/districts"
      />
      {children}
    </>
  );
}
