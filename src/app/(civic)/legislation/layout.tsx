/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { Metadata } from 'next';
import { BreadcrumbSchema, CollectionPageSchema } from '@/components/seo/JsonLd';
import { SITE_OG_IMAGES } from '@/lib/social/site-og-image';

export const metadata: Metadata = {
  title: 'Recent Legislation',
  description:
    'Browse the latest bills introduced in the 119th Congress. See sponsors, cosponsors, voting records, and track legislation through the legislative process.',
  openGraph: {
    images: SITE_OG_IMAGES,
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
      <CollectionPageSchema
        name="Recent Legislation"
        description="Browse the latest bills introduced in the 119th Congress. See sponsors, cosponsors, voting records, and track legislation through the legislative process."
        url="https://civdotiq.org/legislation"
      />
      {children}
    </>
  );
}
