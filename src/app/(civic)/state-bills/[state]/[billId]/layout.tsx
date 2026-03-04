/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { BreadcrumbSchema, LegislationSchema } from '@/components/seo/JsonLd';
import { getStateName } from '@/lib/data/us-states';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ state: string; billId: string }>;
}

export default async function StateBillLayout({ children, params }: LayoutProps) {
  const { state, billId } = await params;
  const stateName = getStateName(state.toUpperCase()) || state.toUpperCase();

  return (
    <>
      <LegislationSchema
        name={billId.toUpperCase()}
        legislationIdentifier={billId.toUpperCase()}
        url={`https://civdotiq.org/state-bills/${state}/${billId}`}
      />
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: stateName, url: `https://civdotiq.org/states/${state}` },
          { name: 'Bills', url: `https://civdotiq.org/state-bills/${state}` },
          {
            name: billId.toUpperCase(),
            url: `https://civdotiq.org/state-bills/${state}/${billId}`,
          },
        ]}
      />
      {children}
    </>
  );
}
