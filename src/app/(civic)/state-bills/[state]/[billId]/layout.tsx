/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { Metadata } from 'next';
import { BreadcrumbSchema, LegislationSchema } from '@/components/seo/JsonLd';
import { getStateName } from '@/lib/data/us-states';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ state: string; billId: string }>;
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { state, billId } = await params;
  const stateName = getStateName(state.toUpperCase()) || state.toUpperCase();

  return {
    title: `${billId.toUpperCase()} — ${stateName} Bill`,
    description: `Details, sponsors, and status for ${billId.toUpperCase()} in the ${stateName} state legislature.`,
    alternates: {
      canonical: `https://civdotiq.org/state-bills/${state.toLowerCase()}/${billId}`,
    },
    openGraph: {
      title: `${billId.toUpperCase()} — ${stateName} Bill | CIV.IQ`,
      description: `Details, sponsors, and status for ${billId.toUpperCase()} in the ${stateName} state legislature.`,
      url: `https://civdotiq.org/state-bills/${state.toLowerCase()}/${billId}`,
      siteName: 'CIV.IQ',
      type: 'website',
    },
  };
}

export default async function StateBillLayout({ children, params }: LayoutProps) {
  const { state, billId } = await params;
  const stateName = getStateName(state.toUpperCase()) || state.toUpperCase();

  return (
    <>
      <LegislationSchema
        name={`${billId.toUpperCase()} — ${stateName} bill`}
        legislationIdentifier={billId.toUpperCase()}
        url={`https://civdotiq.org/state-bills/${state}/${billId}`}
        jurisdiction={{ name: stateName, type: 'State' }}
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
