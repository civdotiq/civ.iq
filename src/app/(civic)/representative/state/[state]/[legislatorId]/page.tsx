/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * State Legislator Profile Page
 *
 * Dynamic route: /representative/state/[state]/[legislatorId]
 * Example: /representative/state/CA/ocd-person/abc123
 *
 * Server-side rendered with direct StateLegislatureCoreService access.
 */

import { notFound } from 'next/navigation';
import dynamicImport from 'next/dynamic';
import { ErrorBoundary } from '@/components/shared/common/ErrorBoundary';
import { ChunkLoadErrorBoundary } from '@/components/shared/common/ChunkLoadErrorBoundary';
import Link from 'next/link';
import { StateLegislatureCoreService } from '@/services/core/state-legislature-core.service';
import type { EnhancedStateLegislator } from '@/types/state-legislature';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 3600; // Revalidate every hour

// Dynamic import for the main profile component to reduce initial bundle size
const SimpleStateLegislatorProfile = dynamicImport(
  () =>
    import('@/features/state-legislature/components/SimpleStateLegislatorProfile').then(mod => ({
      default: mod.SimpleStateLegislatorProfile,
    })),
  {
    loading: () => (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-grid-2 md:px-grid-4 py-grid-3">
          <div className="animate-pulse">
            <div className="h-32 bg-gray-200 border-2 border-gray-300 mb-grid-3"></div>
            <div className="h-16 bg-gray-200 border-2 border-gray-300 mb-grid-3"></div>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-grid-4">
              <div className="h-96 bg-gray-200 border-2 border-gray-300"></div>
              <div className="h-96 bg-gray-200 border-2 border-gray-300"></div>
            </div>
          </div>
        </div>
      </div>
    ),
  }
);

// Server-side data fetching with direct service import (no HTTP networking)
async function getStateLegislatorData(
  state: string,
  legislatorId: string
): Promise<EnhancedStateLegislator> {
  try {
    if (!state || typeof state !== 'string' || !legislatorId || typeof legislatorId !== 'string') {
      notFound();
    }

    // Direct service call - no HTTP networking during SSR
    const legislator = await StateLegislatureCoreService.getStateLegislatorById(
      state.toUpperCase(),
      legislatorId
    );

    if (!legislator) {
      notFound();
    }

    return legislator;
  } catch {
    notFound();
  }
}

// Main Server Component - renders immediately with SSR data
export default async function StateLegislatorProfilePage({
  params,
}: {
  params: Promise<{ state: string; legislatorId: string }>;
}) {
  let state: string;
  let legislatorId: string;

  try {
    const resolvedParams = await params;
    state = resolvedParams.state;
    legislatorId = resolvedParams.legislatorId;

    if (!state || typeof state !== 'string' || !legislatorId || typeof legislatorId !== 'string') {
      notFound();
    }
  } catch {
    notFound();
  }

  // Server-side data fetching - this runs on the server and streams HTML
  const legislator = await getStateLegislatorData(state, legislatorId);

  // Handle fetch errors gracefully - legislator data is required
  if (!legislator) {
    notFound();
  }

  // Validate essential legislator data
  if (!legislator.name) {
    notFound();
  }

  return (
    <>
      <main id="main-content">
        <div className="container mx-auto px-grid-2 md:px-grid-4 py-grid-3">
          <div className="flex justify-between items-center mb-grid-3">
            <div></div>
            <Link
              href="/"
              className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
            >
              ← Back to Search
            </Link>
          </div>
        </div>

        <ChunkLoadErrorBoundary>
          <ErrorBoundary>
            <SimpleStateLegislatorProfile legislator={legislator} />
          </ErrorBoundary>
        </ChunkLoadErrorBoundary>
      </main>
    </>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ state: string; legislatorId: string }>;
}) {
  const { state, legislatorId } = await params;

  // Try to fetch the legislator name for better metadata
  try {
    const legislator = await StateLegislatureCoreService.getStateLegislatorById(
      state.toUpperCase(),
      legislatorId
    );

    if (legislator) {
      const chamberName = legislator.chamber === 'upper' ? 'State Senator' : 'State Representative';
      return {
        title: `${legislator.name} - ${chamberName} | ${state.toUpperCase()} | CIV.IQ`,
        description: `View detailed information about ${legislator.name}, ${chamberName} for ${state.toUpperCase()} District ${legislator.district}`,
      };
    }
  } catch {
    // Fallback to generic metadata if fetch fails
  }

  return {
    title: `State Legislator | ${state.toUpperCase()} | CIV.IQ`,
    description: `View detailed information about state legislator ${legislatorId} from ${state.toUpperCase()}`,
  };
}
