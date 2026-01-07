/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { getRepresentativesByLocation } from '@/features/representatives/services/congress-api';
import {
  getAllRepresentativesService,
  getRepresentativesByZipService,
} from '@/lib/services/representatives.service';
import { AdaptiveGridSkeleton } from '@/shared/components/ui/LoadingStates';

// Dynamic imports for better code splitting
const RepresentativesClient = dynamic(
  () =>
    import('@/features/representatives/components/RepresentativesClient').then(mod => ({
      default: mod.RepresentativesClient,
    })),
  {
    loading: () => <AdaptiveGridSkeleton type="representatives" count={6} />,
  }
);

const PerformanceDashboard = dynamic(
  () =>
    import('@/components/performance/PerformanceDashboard').then(mod => ({
      default: mod.PerformanceDashboard,
    })),
  {
    loading: () => null,
  }
);

interface SearchParams {
  searchParams: Promise<{
    zip?: string;
    state?: string;
    district?: string;
    compare?: string;
    chamber?: string;
    party?: string;
  }>;
}

async function getInitialRepresentatives(zip?: string, state?: string, district?: string) {
  try {
    // If we have state and district, get specific ones
    if (state && district) {
      const representatives = await getRepresentativesByLocation(state, district);
      return representatives;
    }

    // If we have a ZIP, use service directly (no HTTP roundtrip)
    if (zip) {
      return await getRepresentativesByZipService(zip);
    }

    // Otherwise get ALL representatives directly (no HTTP roundtrip)
    return await getAllRepresentativesService();
  } catch {
    return [];
  }
}

export default async function RepresentativesPage({ searchParams }: SearchParams) {
  const { zip, state, district, compare, chamber, party } = await searchParams;
  const compareIds = compare?.split(',').filter(Boolean) || [];

  // Fetch initial data on the server if we have URL params
  const initialRepresentatives = await getInitialRepresentatives(zip, state, district);

  return (
    <div className="min-h-screen bg-white">
      <main id="main-content" className="container mx-auto px-4 py-8 overflow-hidden">
        {/* Breadcrumb Navigation */}
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-blue-600">
            Home
          </Link>
          <span className="mx-2">›</span>
          <span className="font-medium text-gray-900">Representatives</span>
        </nav>

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Representatives</h1>
          <p className="text-xl text-gray-600">
            Browse and compare members of the U.S. House and Senate
          </p>
        </div>

        {/* Compare bar */}
        {compareIds.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Comparing {compareIds.length} representative{compareIds.length > 1 ? 's' : ''}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  {compareIds.length === 2
                    ? 'Click"View Comparison" to see detailed analysis'
                    : 'Select one more representative to compare'}
                </p>
              </div>
            </div>
          </div>
        )}

        <Suspense fallback={<AdaptiveGridSkeleton type="representatives" count={6} />}>
          <RepresentativesClient
            initialRepresentatives={initialRepresentatives}
            compareIds={compareIds}
            initialFilters={{
              chamber: chamber || 'all',
              party: party || 'all',
              state: state || 'all',
            }}
          />
        </Suspense>
      </main>

      {/* Performance Dashboard - Development only */}
      <PerformanceDashboard />
    </div>
  );
}
