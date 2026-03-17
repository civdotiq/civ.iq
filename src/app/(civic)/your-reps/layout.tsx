/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { Metadata } from 'next';
import { GovernmentServiceSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Your Representatives',
  description:
    'Enter your address to see who represents you in Congress with plain-language summaries of their record.',
  openGraph: {
    title: 'Your Representatives — CIV.IQ',
    description:
      'Enter your address to see who represents you in Congress with plain-language summaries of their record.',
  },
};

export default function YourRepsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GovernmentServiceSchema
        name="Find Your Representatives"
        description="Enter your address to find your U.S. Senators and House Representative with voting records, campaign finance, and legislative activity."
        url="https://civdotiq.org/your-reps"
        serviceType="Civic Information"
      />
      {children}
    </>
  );
}
