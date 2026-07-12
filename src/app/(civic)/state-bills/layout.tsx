/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { Metadata } from 'next';
import { BreadcrumbSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'State bill search',
  description:
    'Search current legislation in all 50 state legislatures: bill text, status, sponsors, and votes from official state sources.',
  openGraph: {
    title: 'State bill search | CIV.IQ',
    description:
      'Search current legislation in all 50 state legislatures: bill text, status, sponsors, and votes from official state sources.',
    url: 'https://civdotiq.org/state-bills',
    siteName: 'CIV.IQ',
    type: 'website',
  },
};

export default function StateBillsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'State bill search', url: 'https://civdotiq.org/state-bills' },
        ]}
      />
      {children}
    </>
  );
}
