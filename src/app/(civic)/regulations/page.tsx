/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Regulations route — `?v=new` swaps in the SearchVariants chassis (PR 21).
 * The legacy client page is preserved as the default branch unchanged.
 */

import { RegulationListingPage } from '@/components/search/SearchVariants';
import { LegacyRegulationsPage } from './LegacyRegulationsPage';

interface RegulationsPageProps {
  searchParams: Promise<{ v?: string; agency?: string; status?: string }>;
}

export default async function Page({ searchParams }: RegulationsPageProps) {
  const { v, agency, status } = await searchParams;

  const isPreviewEnv =
    process.env.NEXT_PUBLIC_CIVIQ_V === 'new' && process.env.NODE_ENV !== 'production';
  const useRedesign = v === 'new' || isPreviewEnv;

  if (useRedesign) {
    return <RegulationListingPage agency={agency} status={status} />;
  }

  return <LegacyRegulationsPage />;
}
