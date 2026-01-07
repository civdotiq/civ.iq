'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
// D3 imports removed - not used in current implementation
import { Suspense } from 'react';
import NationalStatsCards from '@/shared/components/ui/NationalStatsCards';
import StateInfoPanel from '@/shared/components/ui/StateInfoPanel';
import CongressSessionInfo from '@/features/districts/components/CongressSessionInfo';
import { DistrictCard } from '@/features/districts/components/DistrictCard';
import { DemographicsDashboard } from '@/features/districts/components/DemographicsDashboard';
import { ApiErrorBoundary } from '@/components/ErrorBoundary';
import { useDistrictsData } from '@/hooks/useDistrictsData';

// Dynamic import of the REAL district map component to avoid SSR issues
const RealDistrictMapContainer = dynamic(
  () =>
    import('@/features/districts/components/RealDistrictMapContainer').then(mod => ({
      default: mod.RealDistrictMapContainer,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-96 bg-white border-2 border-black">
        <div className="text-center">
          <div className="inline-block animate-spin h-8 w-8 border-2 border-civiq-blue border-t-transparent mb-2"></div>
          <p className="text-sm uppercase tracking-aicher font-bold text-gray-600">
            Loading district boundaries...
          </p>
        </div>
      </div>
    ),
  }
);

interface StateInfo {
  code: string;
  name: string;
  population: number;
  districts: number;
  senators: string[];
}

// Main Districts Page
export default function DistrictsPage() {
  const {
    districts,
    apiLoading,
    error,
    errorType,
    retry,
    retryCount,
    fetchDuration,
    cacheStatus,
    circuitState,
  } = useDistrictsData();
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedState, setSelectedState] = useState<StateInfo | null>(null);
  const [filter, setFilter] = useState<'all' | 'competitive' | 'safe-d' | 'safe-r'>('all');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredDistricts = districts.filter(district => {
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesDistrict = `${district.state}-${district.number}`.toLowerCase().includes(query);
      const matchesRepName = district.representative.name.toLowerCase().includes(query);
      const matchesState = district.state.toLowerCase().includes(query);
      const matchesCities = district.geography.majorCities.some(city =>
        city.toLowerCase().includes(query)
      );
      const matchesCounties = district.geography.counties.some(county =>
        county.toLowerCase().includes(query)
      );

      if (
        !matchesDistrict &&
        !matchesRepName &&
        !matchesState &&
        !matchesCities &&
        !matchesCounties
      ) {
        return false;
      }
    }

    // Apply state filter
    if (stateFilter !== 'all' && district.state !== stateFilter) return false;

    // Apply competitiveness filter
    if (filter === 'competitive') {
      const pvi = district.political.cookPVI;
      if (pvi === 'EVEN') return true;
      const match = pvi.match(/[DR]\+(\d+)/);
      return match && parseInt(match[1] || '0') <= 5;
    }
    if (filter === 'safe-d') {
      return district.political.cookPVI.startsWith('D+');
    }
    if (filter === 'safe-r') {
      return district.political.cookPVI.startsWith('R+');
    }

    return true;
  });

  const states = Array.from(new Set(districts.map(d => d.state))).sort();

  const _districtMapData =
    districts.length > 0
      ? districts.map(d => ({
          id: d.id,
          name: `${d.state}-${d.number}`,
          party: d.representative.party === 'D' ? 'Democratic' : 'Republican',
          competitiveness: Math.abs(d.political.lastElection.margin),
          population: d.demographics.population,
        }))
      : [];

  return (
    <div className="min-h-screen bg-white">
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Breadcrumb Navigation */}
        <nav className="text-sm text-gray-500 mb-4 sm:mb-6">
          <Link href="/" className="hover:text-blue-600">
            Home
          </Link>
          <span className="mx-2">›</span>
          <span className="font-medium text-gray-900">Districts</span>
        </nav>

        {/* Page header - Tier 2 medium impact */}
        <div className="mb-4 sm:mb-8">
          <h1 className="accent-section-header text-2xl sm:text-4xl text-gray-900 mb-2 sm:mb-3">
            Congressional Districts
          </h1>
          <p className="text-sm sm:text-xl text-gray-600">
            Explore demographic, political, and geographic data for all U.S. congressional districts
          </p>
        </div>

        {/* 119th Congress Session Information */}
        <CongressSessionInfo />

        {/* Interactive map - renders immediately with PMTiles */}
        <div className="bg-white border-2 border-black p-3 sm:p-6 mb-4 sm:mb-8 relative">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">
            National Congressional Overview
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
            View the United States with state boundaries and congressional districts. Click on
            states to see senators and district information.
          </p>
          <div className="relative">
            <ApiErrorBoundary context="district-map">
              <RealDistrictMapContainer
                selectedDistrict={selectedDistrict}
                onDistrictClick={district => {
                  setSelectedDistrict(district.id || '');
                }}
                height="500px"
                showControls={true}
                enableInteraction={true}
              />
            </ApiErrorBoundary>
            {/* State Info Panel */}
            <StateInfoPanel state={selectedState} onClose={() => setSelectedState(null)} />
          </div>
        </div>

        {/* Districts data - loads progressively */}
        {error ? (
          <div className="bg-red-50 border-2 border-red-200 p-8 mb-8 text-center">
            <div className="text-red-600 text-lg font-medium mb-2">
              {errorType === 'rate-limit'
                ? 'Too Many Requests'
                : errorType === 'timeout'
                  ? 'Connection Timeout'
                  : errorType === 'server'
                    ? 'Server Error'
                    : errorType === 'network'
                      ? 'Network Error'
                      : 'Failed to Load Districts'}
            </div>
            <div className="text-gray-600 mb-4">{error}</div>
            {retryCount > 0 && (
              <div className="text-sm text-gray-500 mb-2">
                Attempted {retryCount} time{retryCount > 1 ? 's' : ''}
              </div>
            )}
            {circuitState === 'open' && (
              <div className="text-sm text-orange-600 mb-4">
                Service temporarily unavailable. Will retry automatically in 30 seconds.
              </div>
            )}
            <button
              onClick={retry}
              disabled={circuitState === 'open' && errorType === 'server'}
              className="px-6 py-2 bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {circuitState === 'open' ? 'Service Unavailable' : 'Retry'}
            </button>
          </div>
        ) : apiLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading representative data...</p>
            {retryCount > 0 && (
              <p className="mt-2 text-sm text-gray-500">Retry attempt {retryCount} of 3...</p>
            )}
          </div>
        ) : (
          <>
            {/* Performance metrics in development */}
            {process.env.NODE_ENV === 'development' && fetchDuration !== null && (
              <div className="bg-gray-50 border border-gray-200 px-4 py-2 mb-4 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>
                    Districts loaded in {fetchDuration.toFixed(0)}ms • {districts.length} districts
                  </span>
                  <span>
                    Cache:{' '}
                    <span
                      className={
                        cacheStatus === 'hit'
                          ? 'text-green-600'
                          : cacheStatus === 'stale'
                            ? 'text-orange-600'
                            : 'text-gray-600'
                      }
                    >
                      {cacheStatus}
                    </span>{' '}
                    • Circuit:{' '}
                    <span
                      className={
                        circuitState === 'open'
                          ? 'text-red-600'
                          : circuitState === 'half-open'
                            ? 'text-orange-600'
                            : 'text-green-600'
                      }
                    >
                      {circuitState}
                    </span>
                  </span>
                </div>
              </div>
            )}

            {/* National Statistics Cards */}
            <ApiErrorBoundary context="national-stats">
              <NationalStatsCards districts={districts} />
            </ApiErrorBoundary>

            {/* Filters */}
            <div className="bg-white border-2 border-black p-6 mb-8">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-64">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                  <input
                    type="text"
                    placeholder="Search by district, representative name, state, or city..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-civiq-blue focus:border-civiq-blue"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                  <select
                    value={stateFilter}
                    onChange={e => setStateFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-civiq-blue focus:border-civiq-blue"
                  >
                    <option value="all">All States</option>
                    {states.map(state => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Competitiveness
                  </label>
                  <select
                    value={filter}
                    onChange={e =>
                      setFilter(e.target.value as 'all' | 'competitive' | 'safe-d' | 'safe-r')
                    }
                    className="px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-civiq-blue focus:border-civiq-blue"
                  >
                    <option value="all">All Districts</option>
                    <option value="competitive">Competitive (±5)</option>
                    <option value="safe-d">Safe Democratic</option>
                    <option value="safe-r">Safe Republican</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Demographics Dashboard */}
            <div className="mb-8">
              <ApiErrorBoundary context="demographics-dashboard">
                <Suspense
                  fallback={
                    <div className="bg-white border-2 border-black p-8">
                      <p className="text-gray-600">Loading demographics...</p>
                    </div>
                  }
                >
                  <DemographicsDashboard
                    districts={filteredDistricts}
                    selectedState={stateFilter}
                  />
                </Suspense>
              </ApiErrorBoundary>
            </div>

            {/* District grid */}
            <div className="mb-8">
              <h2 className="accent-heading text-2xl text-gray-900 mb-4">
                {filteredDistricts.length} Districts
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDistricts.map(district => (
                  <Suspense
                    key={district.id}
                    fallback={
                      <div className="bg-white border-2 border-black p-6 animate-pulse">
                        <div className="h-40 bg-gray-200 rounded"></div>
                      </div>
                    }
                  >
                    <DistrictCard district={district} />
                  </Suspense>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
