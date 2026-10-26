import type { Metadata } from 'next';
import { BreadcrumbSchema, OrganizationSchema, AboutPageSchema } from '@/components/seo/JsonLd';
import { LegacyAboutPage } from '@/components/system/LegacyAboutPage';
import { AboutHybrid } from '@/components/system/AboutHybrid';
import { SITE_OG_IMAGES } from '@/lib/social/site-og-image';
import { ABOUT_META_DESCRIPTION } from '@/lib/seo/meta-descriptions';

export const metadata: Metadata = {
  title: 'About CIV.IQ — Civic Intelligence from Real Government Data',
  description: ABOUT_META_DESCRIPTION,
  openGraph: {
    images: SITE_OG_IMAGES,
    title: 'About CIV.IQ',
    description:
      'Nonpartisan civic intelligence platform. Congress (535 voting members and 6 non-voting delegates), 50 state legislatures, 29 government data sources and 11 open datasets.',
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
      <OrganizationSchema description="CIV.IQ is a civic intelligence platform providing access to federal and state government data. Congress (535 voting members and 6 non-voting delegates), 50 state legislatures (legislators, bills, votes), and machine-learning analysis of federal money-in-politics patterns." />
      <AboutPageSchema
        name="About CIV.IQ"
        description="CIV.IQ provides nonpartisan access to government data for Congress (535 voting members and 6 non-voting delegates), 50 state legislatures, 29 government data sources, and 11 open datasets."
        url="https://civdotiq.org/about"
      />
      {useRedesign ? <AboutHybrid /> : <LegacyAboutPage />}
    </>
  );
}
