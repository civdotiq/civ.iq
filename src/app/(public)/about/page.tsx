import type { Metadata } from 'next';
import { BreadcrumbSchema, OrganizationSchema, AboutPageSchema } from '@/components/seo/JsonLd';
import { LegacyAboutPage } from '@/components/system/LegacyAboutPage';
import { AboutHybrid } from '@/components/system/AboutHybrid';

export const metadata: Metadata = {
  title: 'About CIV.IQ — Civic Intelligence from Real Government Data',
  description:
    'CIV.IQ organizes government data about elected officials from 26 official sources — Congress.gov, FEC, Census Bureau, and more — so citizens can understand who represents them. 535 members of Congress, 50 state legislatures (legislators, bills, votes). Local government is not covered. Nonpartisan.',
  openGraph: {
    title: 'About CIV.IQ',
    description:
      'Nonpartisan civic intelligence platform. 535 members of Congress, 50 state legislatures, 26 government data sources.',
    type: 'website',
  },
  alternates: {
    canonical: 'https://civdotiq.org/about',
  },
};

interface AboutPageProps {
  searchParams: Promise<{ v?: string }>;
}

export default async function AboutPageRoute({ searchParams }: AboutPageProps) {
  const { v } = await searchParams;

  const isPreviewEnv =
    process.env.NEXT_PUBLIC_CIVIQ_V === 'new' && process.env.NODE_ENV !== 'production';
  const useRedesign = v === 'new' || isPreviewEnv;

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'About', url: 'https://civdotiq.org/about' },
        ]}
      />
      <OrganizationSchema description="CIV.IQ is a civic intelligence platform providing access to federal and state government data. 535 members of Congress, 50 state legislatures (legislators, bills, votes), and machine-learning analysis of federal money-in-politics patterns." />
      <AboutPageSchema
        name="About CIV.IQ"
        description="CIV.IQ provides nonpartisan access to government data for 535 members of Congress, 50 state legislatures, and 26 official data sources."
        url="https://civdotiq.org/about"
      />
      {useRedesign ? <AboutHybrid /> : <LegacyAboutPage />}
    </>
  );
}
