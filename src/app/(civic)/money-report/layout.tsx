/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { Metadata } from 'next';
import { GovernmentServiceSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Money Report Card',
  description:
    "Enter your address to see how campaign money connects to your representatives' voting records.",
};

export default function MoneyReportLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GovernmentServiceSchema
        name="Campaign Finance Report Card"
        description="See how campaign contributions connect to your representatives' voting records. Enter your address for a personalized money-to-votes report."
        url="https://civdotiq.org/money-report"
        serviceType="Campaign Finance Analysis"
      />
      {children}
    </>
  );
}
