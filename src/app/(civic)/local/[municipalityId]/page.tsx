/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * City council route.
 *
 * Local (city/county) government data is not a CIV.IQ feature (decided
 * 2026-09-25). In production every `/local/{id}` returns a real 404: there
 * is no stub, no "coming soon" page and no query-string preview. The
 * `/local` index explains why local data is not covered.
 *
 * The council page component and its Detroit/Legistar data code stay in
 * the tree for development only: with NEXT_PUBLIC_CIVIQ_V=new outside
 * production, a configured city id renders `LocalCouncilPage`.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LocalCouncilPage } from '@/components/local/LocalCouncilPage';
import { getCityConfig, isValidMunicipalityId } from '@/components/local/LocalCouncilPage/data';

interface PageProps {
  params: Promise<{ municipalityId: string }>;
}

function isDevPreview(): boolean {
  return process.env.NEXT_PUBLIC_CIVIQ_V === 'new' && process.env.NODE_ENV !== 'production';
}

/** Dev-only: the configured city for this id, or null when the route must 404. */
function devPreviewCity(municipalityId: string) {
  if (!isDevPreview()) return null;
  const rawId = (municipalityId ?? '').trim().toLowerCase();
  if (!isValidMunicipalityId(rawId)) return null;
  return getCityConfig(rawId);
}

export default async function LocalCouncilRoute({ params }: PageProps) {
  const { municipalityId } = await params;
  const cityConfig = devPreviewCity(municipalityId);
  if (!cityConfig) notFound();

  return <LocalCouncilPage cityConfig={cityConfig} />;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { municipalityId } = await params;
  const cityConfig = devPreviewCity(municipalityId);
  if (!cityConfig) notFound();

  return {
    title: `${cityConfig.name} City Council (development preview)`,
    robots: { index: false, follow: false },
  };
}
