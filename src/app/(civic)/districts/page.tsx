/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Districts route — `?v=new` swaps in the SearchVariants chassis (PR 21).
 * The legacy client page is preserved as the default branch unchanged.
 */

import { DistrictListingPage } from '@/components/search/SearchVariants';
import { LegacyDistrictsPage } from './LegacyDistrictsPage';

interface DistrictsPageProps {
  searchParams: Promise<{ v?: string; state?: string }>;
}

export default async function Page({ searchParams }: DistrictsPageProps) {
  const { v, state } = await searchParams;

  const isPreviewEnv =
    process.env.NEXT_PUBLIC_CIVIQ_V === 'new' && process.env.NODE_ENV !== 'production';
  const useRedesign = v === 'new' || isPreviewEnv;

  if (useRedesign) {
    return <DistrictListingPage state={state} />;
  }

  return <LegacyDistrictsPage />;
}
