import type { Metadata } from 'next';
import { BreadcrumbSchema, GovernmentServiceSchema } from '@/components/seo/JsonLd';
import { SITE_OG_IMAGES } from '@/lib/social/site-og-image';

export const metadata: Metadata = {
  title: { default: 'Federal Spending', template: '%s | CIV.IQ' },
  description:
    'Explore federal contracts and grants by congressional district. All data from USASpending.gov.',
  openGraph: {
    images: SITE_OG_IMAGES,
    title: 'Federal Spending | CIV.IQ',
    description:
      'Explore federal contracts and grants by congressional district. All data from USASpending.gov.',
    url: 'https://civdotiq.org/spending',
    siteName: 'CIV.IQ',
    type: 'website',
  },
};

export default function SpendingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Federal Spending', url: 'https://civdotiq.org/spending' },
        ]}
      />
      <GovernmentServiceSchema
        name="Federal Spending Explorer"
        description="Explore federal contracts and grants by congressional district. All data from USASpending.gov."
        url="https://civdotiq.org/spending"
        serviceType="Government Data"
      />
      {children}
    </>
  );
}
