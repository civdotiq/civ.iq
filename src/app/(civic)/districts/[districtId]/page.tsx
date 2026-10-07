/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { notFound, permanentRedirect } from 'next/navigation';
import { DistrictPage as RedesignedDistrictPage } from '@/components/districts/DistrictPage';
import { canonicalizeDistrictId } from '@/lib/helpers/url-builders';
import { checkDistrictId } from '@/lib/districts/known-districts';
import { loadDistrictPage } from '@/lib/districts/load-district-page';
import DistrictPageClient from './DistrictPageClient';
import { SeatWithoutMember } from './SeatWithoutMember';

interface DistrictPageProps {
  params: Promise<{ districtId: string }>;
  searchParams: Promise<{ v?: string }>;
}

export default async function DistrictPage({ params, searchParams }: DistrictPageProps) {
  const { districtId } = await params;
  const { v } = await searchParams;

  // Middleware has already 308'd spelling variants (NY-8, ny8) to the canonical id.
  const parsed = canonicalizeDistrictId(districtId);
  if (!parsed) notFound();

  // Checked against the local seat list before any fetch, so the status is real.
  const check = checkDistrictId(parsed.state, parsed.district);
  if (check.kind === 'unknown') notFound();
  if (check.kind === 'at-large') permanentRedirect(`/districts/${check.canonical}`);

  // PR 14: redesigned district page behind ?v=new (or NEXT_PUBLIC_CIVIQ_V
  // outside production). Old design path stays the default.
  const isPreviewEnv =
    process.env.NEXT_PUBLIC_CIVIQ_V === 'new' && process.env.NODE_ENV !== 'production';
  if (v === 'new' || isPreviewEnv) {
    return <RedesignedDistrictPage districtId={parsed.canonical} />;
  }

  const data = await loadDistrictPage(parsed.canonical);
  if (data.status === 'no-member') {
    return <SeatWithoutMember state={parsed.state} district={parsed.district} />;
  }

  return (
    <DistrictPageClient
      districtId={parsed.canonical}
      initialDistrict={data.status === 'found' ? data.district : null}
    />
  );
}
