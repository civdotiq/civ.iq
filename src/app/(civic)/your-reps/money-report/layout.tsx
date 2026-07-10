/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { Metadata } from 'next';
import { GovernmentServiceSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  alternates: { canonical: 'https://civdotiq.org/your-reps/money-report' },
  title: 'Money Report Card — Your Representatives',
  description:
    'See how campaign money correlates with voting patterns for all your congressional representatives.',
  openGraph: {
    title: 'Money Report Card — CIV.IQ',
    description:
      'See how campaign money correlates with voting patterns for all your congressional representatives.',
  },
};

export default function MoneyReportLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GovernmentServiceSchema
        name="Money Report Card"
        description="Enter your address to see how campaign contributions correlate with voting patterns for your representatives in Congress."
        url="https://civdotiq.org/your-reps/money-report"
        serviceType="Civic Intelligence"
      />
      {children}
    </>
  );
}
