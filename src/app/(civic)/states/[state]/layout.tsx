/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { Metadata } from 'next';
import { BreadcrumbSchema, AdministrativeAreaSchema } from '@/components/seo/JsonLd';
import { getStateName } from '@/lib/data/us-states';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ state: string }>;
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { state } = await params;
  const stateName = getStateName(state.toUpperCase()) || state.toUpperCase();

  return {
    title: `${stateName} — State Profile`,
    description: `Government data for ${stateName}: congressional delegation, state legislature, demographics, economy, and election results.`,
    openGraph: {
      title: `${stateName} — State Profile | CIV.IQ`,
      description: `Government data for ${stateName}: congressional delegation, state legislature, demographics, economy, and election results.`,
      url: `https://civdotiq.org/states/${state.toLowerCase()}`,
      siteName: 'CIV.IQ',
      type: 'website',
    },
  };
}

export default async function StateLayout({ children, params }: LayoutProps) {
  const { state } = await params;
  const stateName = getStateName(state.toUpperCase()) || state.toUpperCase();

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'States', url: 'https://civdotiq.org/states' },
          { name: stateName, url: `https://civdotiq.org/states/${state}` },
        ]}
      />
      <AdministrativeAreaSchema
        name={stateName}
        url={`https://civdotiq.org/states/${state.toLowerCase()}`}
        containedInPlace="United States of America"
        containedInType="Country"
      />
      {children}
    </>
  );
}
