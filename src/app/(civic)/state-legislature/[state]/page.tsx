/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { Suspense } from 'react';
import Link from 'next/link';
import {
  StateLegislaturePage,
  loadStateLegislaturePageData,
} from '@/components/state-officials/StateLegislaturePage';
import { LegacyStateLegislaturePage } from '@/components/states/LegacyStateLegislature';
import { getStateName, normalizeStateIdentifier } from '@/lib/data/us-states';

interface PageProps {
  params: Promise<{ state: string }>;
  searchParams: Promise<{ v?: string }>;
}

export default async function StateLegislatureRoute({ params, searchParams }: PageProps) {
  const { state } = await params;
  const { v } = await searchParams;

  const isPreviewEnv =
    process.env.NEXT_PUBLIC_CIVIQ_V === 'new' && process.env.NODE_ENV !== 'production';
  const useRedesign = v === 'new' || isPreviewEnv;

  if (!useRedesign) {
    return <LegacyStateLegislaturePage />;
  }

  const stateCode = normalizeStateIdentifier(state);
  const stateName = stateCode ? getStateName(stateCode) : undefined;

  if (!stateCode || !stateName) {
    return (
      <div style={{ padding: '32px 36px 56px', maxWidth: 1280, margin: '0 auto' }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 12 }}>State not found</h1>
        <p style={{ fontSize: 14, color: 'var(--fg2)' }}>
          &ldquo;{state}&rdquo; is not a recognized U.S. state code.{' '}
          <Link href="/states" style={{ color: 'var(--civiq-blue-active)' }}>
            Browse all states →
          </Link>
        </p>
      </div>
    );
  }

  return (
    <Suspense fallback={<RedesignLoading stateCode={stateCode} />}>
      <RedesignedLegislatureContent stateCode={stateCode} />
    </Suspense>
  );
}

async function RedesignedLegislatureContent({ stateCode }: { stateCode: string }) {
  const data = await loadStateLegislaturePageData(stateCode);
  return <StateLegislaturePage data={data} />;
}

function RedesignLoading({ stateCode }: { stateCode: string }) {
  return (
    <div style={{ padding: '32px 36px 56px', maxWidth: 1280, margin: '0 auto' }}>
      <p
        style={{
          fontSize: 11,
          color: 'var(--fg3)',
          fontFamily: 'var(--font-mono)',
          letterSpacing: 'var(--tracking-label)',
          textTransform: 'uppercase',
        }}
      >
        Loading {stateCode} legislature…
      </p>
    </div>
  );
}
