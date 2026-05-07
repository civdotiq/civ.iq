/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { SearchResults } from '@/components/search/SearchResults';
import { LegacySearchPage } from './LegacySearchPage';

interface SearchPageProps {
  searchParams: Promise<{ q?: string; v?: string; type?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q, v, type } = await searchParams;

  const isPreviewEnv =
    process.env.NEXT_PUBLIC_CIVIQ_V === 'new' && process.env.NODE_ENV !== 'production';
  const useRedesign = v === 'new' || isPreviewEnv;

  if (useRedesign) {
    return <SearchResults query={q ?? ''} type={type} />;
  }

  return <LegacySearchPage />;
}
