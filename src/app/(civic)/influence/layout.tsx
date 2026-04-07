/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { Metadata } from 'next';
import { BreadcrumbSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Follow the Money',
  description:
    'Search any PAC, Super PAC, or political committee to see who they fund in Congress. All data from FEC.gov.',
  openGraph: {
    title: 'Follow the Money | CIV.IQ',
    description:
      'Search any PAC, Super PAC, or political committee to see who they fund in Congress. All data from FEC.gov.',
    url: 'https://civdotiq.org/influence',
    siteName: 'CIV.IQ',
    type: 'website',
  },
};

export default function InfluenceLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Follow the Money', url: 'https://civdotiq.org/influence' },
        ]}
      />
      {children}
    </>
  );
}
