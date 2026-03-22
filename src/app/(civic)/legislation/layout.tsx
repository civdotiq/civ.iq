/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { Metadata } from 'next';
import { BreadcrumbSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Recent Legislation',
  description:
    'Browse the latest bills introduced in the 119th Congress. See sponsors, cosponsors, voting records, and track legislation through the legislative process.',
  openGraph: {
    title: 'Recent Legislation',
    description:
      'Browse the latest bills introduced in the 119th Congress. See sponsors, cosponsors, voting records, and track legislation through the legislative process.',
    type: 'website',
  },
};

export default function LegislationLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Legislation', url: 'https://civdotiq.org/legislation' },
        ]}
      />
      {children}
    </>
  );
}
