import type { Metadata } from 'next';
import { BreadcrumbSchema, CollectionPageSchema } from '@/components/seo/JsonLd';

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
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Enforcement Actions', url: 'https://civdotiq.org/enforcement' },
        ]}
      />
      <CollectionPageSchema
        name="Federal Enforcement Actions"
        description="Browse federal enforcement actions from EPA, OSHA, SEC, and CFPB. Search by sector, state, or organization."
        url="https://civdotiq.org/enforcement"
      />
      {children}
    </>
  );
}
