'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useState, useEffect, useCallback } from 'react';
import logger from '@/lib/logging/simple-logger';
import Link from 'next/link';
import dynamic from 'next/dynamic';
// D3 imports removed - not used in current implementation
import { Suspense } from 'react';
import NationalStatsCards from '@/shared/components/ui/NationalStatsCards';
import StateInfoPanel from '@/shared/components/ui/StateInfoPanel';
import CongressSessionInfo from '@/features/districts/components/CongressSessionInfo';
import { CiviqLogo } from '@/shared/components/branding/CiviqLogo';
import { DistrictCard } from '@/features/districts/components/DistrictCard';
import { DemographicsDashboard } from '@/features/districts/components/DemographicsDashboard';
import { ApiErrorBoundary } from '@/components/ErrorBoundary';

// Dynamic import of the REAL district map component to avoid SSR issues
const RealDistrictMapContainer = dynamic(
  () =>
    import('@/features/districts/components/RealDistrictMapContainer').then(mod => ({
      default: mod.RealDistrictMapContainer,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-96 bg-white border-2 border-gray-300">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
          <p className="text-sm text-gray-600">Loading real district boundaries...</p>
        </div>
      </div>
    ),
  }
);

// Types
interface District {
  id: string;
  state: string;
  number: string;
  name: string;
  representative: {
    name: string;
    party: string;
    imageUrl?: string;
  };
  demographics: {
    population: number;
    medianIncome: number;
    medianAge: number;
    diversityIndex: number;
    urbanPercentage: number;
  };
  political: {
    cookPVI: string;
    lastElection: {
      winner: string;
      margin: number;
      turnout: number;
    };
    registeredVoters: number;
  };
  geography: {
    area: number;
    counties: string[];
    majorCities: string[];
  };
}

interface StateInfo {
  code: string;
  name: string;
  population: number;
  districts: number;
  senators: string[];
}

// Main Districts Page
export default function DistrictsPage() {
  const [districts, setDistricts] = useState<District[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedState, setSelectedState] = useState<StateInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'competitive' | 'safe-d' | 'safe-r'>('all');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [_allRepresentatives, _setAllRepresentatives] = useState<unknown[]>([]);

  const fetchAllRepresentatives = async () => {
    try {
      const response = await fetch('/api/representatives/all');
      if (response.ok) {
        const data = await response.json();
        _setAllRepresentatives(data.representatives || []);
      }
    } catch {
      // Error will be handled by the error boundary
    }
  };

  const fetchDistricts = useCallback(async () => {
    logger.info('[Districts] Starting fetch...', {
      currentDistrictCount: districts.length,
    });
    setLoading(true);
    try {
      // Fetch real district data from our representatives API
      // Bust cache on first load to get fresh data
      const url = districts.length === 0 ? '/api/districts/all?bust=true' : '/api/districts/all';
      logger.info('[Districts] Fetching from URL', { url });
      const response = await fetch(url);
      logger.info('[Districts] API response received', {
        status: response.status,
        ok: response.ok,
      });

      if (response.ok) {
        const data = await response.json();
        logger.info('Districts API returned', { districtCount: data.districts?.length });
        if (data.districts && data.districts.length > 0) {
          setDistricts(data.districts);
        } else {
          throw new Error('No districts returned from API');
        }
      } else {
        const errorData = await response.json();
        logger.error('Districts API error', new Error(errorData.error || 'API Error'), {
          errorData,
        });
        throw new Error(
          `Failed to fetch districts: ${response.status} - ${errorData.details || errorData.error}`
        );
      }
    } catch (error) {
      logger.error('Error fetching districts', error as Error);
      // Error will be handled by the error boundary

      // No fallback mock data - show clear unavailable state
      logger.warn('Districts data unavailable, showing empty state');
      setDistricts([]);
    } finally {
      setLoading(false);
    }
  }, [districts.length]);

  useEffect(() => {
    fetchDistricts();
    fetchAllRepresentatives();
  }, [fetchDistricts]);

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
      {/* Header */}
      <header className="bg-white border-2 border-black border-b sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <CiviqLogo />
            </Link>
            <nav className="flex items-center gap-6">
              <Link
                href="/representatives"
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                Representatives
              </Link>
              <Link href="/districts" className="text-blue-600 font-medium">
                Districts
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Congressional Districts</h1>
          <p className="text-xl text-gray-600">
            Explore demographic, political, and geographic data for all U.S. congressional districts
          </p>
        </div>

        {/* 119th Congress Session Information */}
        <CongressSessionInfo />

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading districts...</p>
          </div>
        ) : (
          <>
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
                    className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                  <select
                    value={stateFilter}
                    onChange={e => setStateFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 focus:outline-none focus:border-blue-500"
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
                    className="px-4 py-2 border border-gray-300 focus:outline-none focus:border-blue-500"
                  >
                    <option value="all">All Districts</option>
                    <option value="competitive">Competitive (±5)</option>
                    <option value="safe-d">Safe Democratic</option>
                    <option value="safe-r">Safe Republican</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Interactive map */}
            <div className="bg-white border-2 border-black p-6 mb-8 relative">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                National Congressional Overview
              </h2>
              <p className="text-sm text-gray-600 mb-4">
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
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
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

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400">
            Data sourced from Census.gov and official government sources
          </p>
          <p className="text-gray-500 text-sm mt-2">
            © 2019-2025 Mark Sandford. CIV.IQ™ - The Original Civic Information Platform
          </p>
        </div>
      </footer>
    </div>
  );
}
