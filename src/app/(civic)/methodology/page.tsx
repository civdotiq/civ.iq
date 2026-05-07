/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { LegacyMethodologyPage } from '@/components/system/LegacyMethodologyPage';
import { MethodologyHybrid } from '@/components/system/MethodologyHybrid';

interface MethodologyPageProps {
  searchParams: Promise<{ v?: string }>;
}

export default async function MethodologyPageRoute({ searchParams }: MethodologyPageProps) {
  const { v } = await searchParams;

  const isPreviewEnv =
    process.env.NEXT_PUBLIC_CIVIQ_V === 'new' && process.env.NODE_ENV !== 'production';
  const useRedesign = v === 'new' || isPreviewEnv;

  if (useRedesign) {
    return <MethodologyHybrid />;
  }

  return <LegacyMethodologyPage />;
}
