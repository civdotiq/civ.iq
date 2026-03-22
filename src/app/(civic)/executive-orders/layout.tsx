/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { Metadata } from 'next';
import { BreadcrumbSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Executive Orders',
  description:
    'Browse executive orders and presidential actions. Track new directives, see which agencies are affected, and understand their impact on federal policy.',
  openGraph: {
    title: 'Executive Orders',
    description:
      'Browse executive orders and presidential actions. Track new directives, see which agencies are affected, and understand their impact on federal policy.',
    type: 'website',
  },
};

export default function ExecutiveOrdersLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Executive Orders', url: 'https://civdotiq.org/executive-orders' },
        ]}
      />
      {children}
    </>
  );
}
