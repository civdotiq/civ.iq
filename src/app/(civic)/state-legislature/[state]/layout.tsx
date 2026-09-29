/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { Metadata } from 'next';

import { getStateName } from '@/lib/data/us-states';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ state: string }>;
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { state } = await params;
  const stateName = getStateName(state.toUpperCase()) || state.toUpperCase();

  return {
    title: { default: `${stateName} Legislature`, template: '%s | CIV.IQ' },
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

// The hub's canonical and JSON-LD live in page.tsx, not here: a layout's
// metadata and schema are inherited by every legislator, committee and vote
// page below it, which gave each of them a second BreadcrumbList.
export default function StateLegislatureLayout({ children }: LayoutProps) {
  return <>{children}</>;
}
