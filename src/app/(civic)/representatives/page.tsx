/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { Suspense } from 'react';
import Link from 'next/link';
import { getRepresentativesByLocation } from '@/features/representatives/services/congress-api';
import { CiviqLogo } from '@/shared/ui/CiviqLogo';
import { RepresentativesClient } from './components/RepresentativesClient';

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
  if (state && district) {
    return await getRepresentativesByLocation(state, district);
  }
  return [];
}

export default async function RepresentativesPage({ searchParams }: SearchParams) {
  const { zip, state, district, compare, chamber, party } = await searchParams;
  const compareIds = compare?.split(',').filter(Boolean) || [];

  // Fetch initial data on the server if we have URL params
  const initialRepresentatives = await getInitialRepresentatives(zip, state, district);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <CiviqLogo />
            </Link>
            <nav className="flex items-center gap-6">
              <Link href="/representatives" className="text-blue-600 font-medium">
                Representatives
              </Link>
              <Link
                href="/districts"
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                Districts
              </Link>
              <Link
                href="/analytics"
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                Analytics
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Representatives</h1>
          <p className="text-xl text-gray-600">
            Browse and compare members of the U.S. House and Senate
          </p>
        </div>

        {/* Compare bar */}
        {compareIds.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Comparing {compareIds.length} representative{compareIds.length > 1 ? 's' : ''}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  {compareIds.length === 2
                    ? 'Click "View Comparison" to see detailed analysis'
                    : 'Select one more representative to compare'}
                </p>
              </div>
            </div>
          </div>
        )}

        <Suspense
          fallback={
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading representatives...</p>
            </div>
          }
        >
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

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400">
            Data sourced from Congress.gov and official government sources
          </p>
          <p className="text-gray-500 text-sm mt-2">
            © 2019-2025 Mark Sandford. CIV.IQ™ - The Original Civic Information Platform
          </p>
        </div>
      </footer>
    </div>
  );
}
