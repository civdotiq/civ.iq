/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { Metadata } from 'next';
import { BreadcrumbSchema, GovernmentOrganizationSchema } from '@/components/seo/JsonLd';
import { getStateName } from '@/lib/data/us-states';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ state: string }>;
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { state } = await params;
  const stateName = getStateName(state.toUpperCase()) || state.toUpperCase();

  return {
    title: `${stateName} Legislature`,
    description: `${stateName} state legislators, committees, bills, and votes. Browse the full roster and track legislative activity.`,
    openGraph: {
      title: `${stateName} Legislature | CIV.IQ`,
      description: `${stateName} state legislators, committees, bills, and votes. Browse the full roster and track legislative activity.`,
      url: `https://civdotiq.org/state-legislature/${state.toLowerCase()}`,
      siteName: 'CIV.IQ',
      type: 'website',
    },
  };
}

export default async function StateLegislatureLayout({ children, params }: LayoutProps) {
  const { state } = await params;
  const stateName = getStateName(state.toUpperCase()) || state.toUpperCase();

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: stateName, url: `https://civdotiq.org/states/${state}` },
          { name: 'Legislature', url: `https://civdotiq.org/state-legislature/${state}` },
        ]}
      />
      <GovernmentOrganizationSchema
        name={`${stateName} State Legislature`}
        description={`State legislators, committees, bills, and votes for ${stateName}.`}
        url={`https://civdotiq.org/state-legislature/${state.toLowerCase()}`}
        parentOrganization={`State of ${stateName}`}
        areaServed={stateName}
      />
      {children}
    </>
  );
}
