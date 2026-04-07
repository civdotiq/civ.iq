import type { Metadata } from 'next';
import { BreadcrumbSchema, CollectionPageSchema } from '@/components/seo/JsonLd';

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
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Regulations', url: 'https://civdotiq.org/regulations' },
        ]}
      />
      <CollectionPageSchema
        name="Federal Regulations"
        description="Search and browse federal regulations from the Federal Register. Filter by agency, type, and date."
        url="https://civdotiq.org/regulations"
      />
      {children}
    </>
  );
}
