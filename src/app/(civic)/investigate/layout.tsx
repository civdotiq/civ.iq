/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { Metadata } from 'next';
import { SITE_OG_IMAGES } from '@/lib/social/site-og-image';

export const metadata: Metadata = {
  title: 'Investigate',
  description:
    'Explore connections between legislators, donors, committees, and government contracts. Follow the money and trace influence through real government data.',
  openGraph: {
    images: SITE_OG_IMAGES,
    title: 'Investigate | CIV.IQ',
    description:
      'Explore connections between legislators, donors, committees, and government contracts. Follow the money and trace influence through real government data.',
    url: 'https://civdotiq.org/investigate',
    siteName: 'CIV.IQ',
    type: 'website',
  },
};

export default function InvestigateLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
