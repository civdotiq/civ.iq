/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { Metadata } from 'next';
import { AboutPageSchema, BreadcrumbSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Methodology',
  description:
    'How CIV.IQ analyzes campaign finance, voting records, and lobbying data. Academic citations, data sources, confidence scoring, and what we do not claim.',
  openGraph: {
    title: 'Methodology | CIV.IQ',
    description:
      'How CIV.IQ analyzes campaign finance, voting records, and lobbying data. Academic citations, data sources, confidence scoring, and what we do not claim.',
    url: 'https://civdotiq.org/methodology',
    siteName: 'CIV.IQ',
    type: 'website',
  },
};

export default function MethodologyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Methodology', url: 'https://civdotiq.org/methodology' },
        ]}
      />
      <AboutPageSchema
        name="CIV.IQ Methodology"
        description="How CIV.IQ analyzes campaign finance, voting records, and lobbying data using official government sources and peer-reviewed research."
        url="https://civdotiq.org/methodology"
      />
      {children}
    </>
  );
}
