/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { Metadata } from 'next';
import { BreadcrumbSchema, GovernmentServiceSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Open Comment Periods | CIV.IQ',
  description:
    'Track open federal comment periods. See which regulations are accepting public comments, deadlines, and how to participate in the rulemaking process.',
  openGraph: {
    title: 'Open Comment Periods | CIV.IQ',
    description:
      'Track open federal comment periods. See which regulations are accepting public comments, deadlines, and how to participate in the rulemaking process.',
    type: 'website',
  },
};

export default function CommentPeriodsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Comment Periods', url: 'https://civdotiq.org/comment-periods' },
        ]}
      />
      <GovernmentServiceSchema
        name="Public Comment Tracker"
        description="Track open federal comment periods. See which regulations are accepting public comments, deadlines, and how to participate in the rulemaking process."
        url="https://civdotiq.org/comment-periods"
        serviceType="Public Comment Tracking"
      />
      {children}
    </>
  );
}
