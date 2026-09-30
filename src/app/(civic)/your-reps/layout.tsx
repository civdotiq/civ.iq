/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { Metadata } from 'next';
import { GovernmentServiceSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: { default: 'Your Representatives', template: '%s | CIV.IQ' },
  description:
    'Enter your home address to see who represents you in Congress and your state legislature, with contact details and plain-language summaries of their record.',
  alternates: { canonical: 'https://civdotiq.org/your-reps' },
  openGraph: {
    title: 'Your Representatives — CIV.IQ',
    description:
      'Enter your home address to see who represents you in Congress and your state legislature.',
  },
};

export default function YourRepsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GovernmentServiceSchema
        name="Find Your Representatives"
        description="Enter your home address to find your U.S. Senators, House member and state legislators, with contact details, voting records, and campaign finance."
        url="https://civdotiq.org/your-reps"
        serviceType="Civic Information"
      />
      {children}
    </>
  );
}
