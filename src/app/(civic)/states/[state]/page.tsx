/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadStateOverviewData, StateOverview } from '@/components/states/StateOverview';
import { LegacyStateOverviewPage } from '@/components/states/LegacyStateOverview';
import { getStateName, isValidStateCode, normalizeStateIdentifier } from '@/lib/data/us-states';
import { loadStateHub, type StateHubData } from '@/lib/state-hub/load-state-hub';
import { loadStateOverview } from '@/lib/state-overview/load-state-overview';
import { StateOverviewServerSections } from '@/components/states/LegacyStateOverview/StateOverviewServerSections';

interface StatePageProps {
  params: Promise<{ state: string }>;
  searchParams: Promise<{ v?: string }>;
}

/** Server-rendered link to the "Who is my state representative?" hub. */
function LegislatureHubLink({ hub }: { hub: StateHubData }) {
  const roles = hub.chambers.map(c => c.roleTitle).join(' and ');
  return (
    <div className="bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 pt-6">
        <Link
          href={`/state-legislature/${hub.stateCode.toLowerCase()}`}
          className="block border-2 border-gray-900 bg-white p-4 hover:border-[#3ea2d4]"
        >
          <span className="block text-lg font-semibold text-gray-900">{hub.copy.h1}</span>
          <span className="block type-sm text-[#3ea2d4] mt-1">
            Find your {roles} by address, with phone and email for all {hub.memberCount} members →
          </span>
        </Link>
      </div>
    </div>
  );
}

export default async function StateOverviewPageRoute({ params, searchParams }: StatePageProps) {
  const { state } = await params;
  const { v } = await searchParams;
  // Two-letter codes only: /states/MI 308s to /states/mi in middleware, and
  // anything else is a real 404 rather than an empty client shell.
  if (!isValidStateCode(state)) notFound();

  const isPreviewEnv =
    process.env.NEXT_PUBLIC_CIVIQ_V === 'new' && process.env.NODE_ENV !== 'production';
  const useRedesign = v === 'new' || isPreviewEnv;

  if (!useRedesign) {
    const stateCode = state.toUpperCase();
    const [hub, overview] = await Promise.all([loadStateHub(state), loadStateOverview(stateCode)]);
    return (
      <>
        {hub && <LegislatureHubLink hub={hub} />}
        <LegacyStateOverviewPage
          initialDemographics={overview.demographics}
          serverSections={
            <StateOverviewServerSections
              stateCode={stateCode}
              stateName={getStateName(stateCode) ?? stateCode}
              data={overview}
              hub={hub}
            />
          }
        />
      </>
    );
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
      <RedesignedStateContent stateCode={stateCode} />
    </Suspense>
  );
}

async function RedesignedStateContent({ stateCode }: { stateCode: string }) {
  const data = await loadStateOverviewData(stateCode);
  return <StateOverview data={data} />;
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
        Loading {stateCode} data…
      </p>
    </div>
  );
}
