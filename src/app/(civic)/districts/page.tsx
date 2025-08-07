'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useState, useEffect, useCallback } from 'react';
import logger from '@/lib/logging/simple-logger';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
// D3 imports removed - not used in current implementation
import { Users, Building2, MapPin } from 'lucide-react';
import NationalStatsCards from '@/shared/components/ui/NationalStatsCards';
import StateInfoPanel from '@/shared/components/ui/StateInfoPanel';

// Dynamic import of the REAL district map component to avoid SSR issues
const RealDistrictMapContainer = dynamic(
  () =>
    import('@/features/districts/components/RealDistrictMapContainer').then(mod => ({
      default: mod.RealDistrictMapContainer,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
          <p className="text-sm text-gray-600">Loading real district boundaries...</p>
        </div>
      </div>
    ),
  }
);

// Logo component
function CiviqLogo() {
  return (
    <div className="flex items-center group">
      <svg
        className="w-10 h-10 transition-transform group-hover:scale-110"
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="36" y="51" width="28" height="30" fill="#0b983c" />
        <circle cx="50" cy="31" r="22" fill="#ffffff" />
        <circle cx="50" cy="31" r="20" fill="#e11d07" />
        <circle cx="38" cy="89" r="2" fill="#3ea2d4" className="animate-pulse" />
        <circle
          cx="46"
          cy="89"
          r="2"
          fill="#3ea2d4"
          className="animate-pulse animation-delay-100"
        />
        <circle
          cx="54"
          cy="89"
          r="2"
          fill="#3ea2d4"
          className="animate-pulse animation-delay-200"
        />
        <circle
          cx="62"
          cy="89"
          r="2"
          fill="#3ea2d4"
          className="animate-pulse animation-delay-300"
        />
      </svg>
      <span className="ml-3 text-xl font-bold text-gray-900">CIV.IQ</span>
    </div>
  );
}

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

// District card component
function DistrictCard({ district }: { district: District }) {
  const getPVIColor = (pvi: string) => {
    if (pvi.startsWith('D+')) return 'text-blue-600';
    if (pvi.startsWith('R+')) return 'text-red-600';
    return 'text-gray-600';
  };

  const getPVIBackground = (pvi: string) => {
    if (pvi.startsWith('D+')) return 'bg-blue-100';
    if (pvi.startsWith('R+')) return 'bg-red-100';
    return 'bg-gray-100';
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">
            {district.state}-{district.number}
          </h3>
          <p className="text-sm text-gray-600">{district.name}</p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${getPVIBackground(district.political.cookPVI)} ${getPVIColor(district.political.cookPVI)}`}
        >
          {district.political.cookPVI}
        </span>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden">
          {district.representative.imageUrl ? (
            <Image
              src={district.representative.imageUrl}
              alt={district.representative.name}
              width={48}
              height={48}
              className="w-12 h-12 object-cover"
            />
          ) : (
            <span className="text-xs text-gray-600">Photo</span>
          )}
        </div>
        <div>
          <p className="font-medium text-gray-900">{district.representative.name}</p>
          <p className="text-sm text-gray-600">
            {district.representative.party === 'D' ? 'Democrat' : 'Republican'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-600">Population</p>
          <p className="font-semibold">{district.demographics.population.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Median Income</p>
          <p className="font-semibold">${district.demographics.medianIncome.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Last Election</p>
          <p className="font-semibold">
            {district.political.lastElection.margin.toFixed(1)}% margin
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Turnout</p>
          <p className="font-semibold">{district.political.lastElection.turnout}%</p>
        </div>
      </div>

      <Link
        href={`/districts/${district.state}-${district.number}`}
        className="block w-full text-center py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        View Details
      </Link>
    </div>
  );
}

// Enhanced Demographics Dashboard
function DemographicsDashboard({
  districts,
  selectedState,
}: {
  districts: District[];
  selectedState?: string;
}) {
  // Handle empty districts array
  if (!districts || districts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {selectedState ? `${selectedState} Demographics` : 'National Demographics Overview'}
        </h2>
        <p className="text-gray-600">Loading district data...</p>
      </div>
    );
  }

  // Filter districts by state if selected
  const filteredDistricts =
    selectedState && selectedState !== 'all'
      ? districts.filter(d => d.state === selectedState)
      : districts;

  // Calculate comprehensive statistics
  const stats = {
    // Basic counts
    totalDistricts: filteredDistricts.length,
    democraticDistricts: filteredDistricts.filter(d => d.representative.party === 'D').length,
    republicanDistricts: filteredDistricts.filter(d => d.representative.party === 'R').length,

    // Population stats
    totalPopulation: filteredDistricts.reduce((sum, d) => sum + d.demographics.population, 0),
    avgPopulation:
      filteredDistricts.reduce((sum, d) => sum + d.demographics.population, 0) /
      filteredDistricts.length,

    // Economic stats
    avgMedianIncome:
      filteredDistricts.reduce((sum, d) => sum + d.demographics.medianIncome, 0) /
      filteredDistricts.length,
    highestIncome: Math.max(...filteredDistricts.map(d => d.demographics.medianIncome)),
    lowestIncome: Math.min(...filteredDistricts.map(d => d.demographics.medianIncome)),

    // Demographics
    avgMedianAge:
      filteredDistricts.reduce((sum, d) => sum + d.demographics.medianAge, 0) /
      filteredDistricts.length,
    avgUrbanPercentage:
      filteredDistricts.reduce((sum, d) => sum + d.demographics.urbanPercentage, 0) /
      filteredDistricts.length,
    avgDiversityIndex:
      filteredDistricts.reduce((sum, d) => sum + d.demographics.diversityIndex, 0) /
      filteredDistricts.length,

    // Political stats
    avgElectionMargin:
      filteredDistricts.reduce((sum, d) => sum + d.political.lastElection.margin, 0) /
      filteredDistricts.length,
    avgTurnout:
      filteredDistricts.reduce((sum, d) => sum + d.political.lastElection.turnout, 0) /
      filteredDistricts.length,
    competitiveDistricts: filteredDistricts.filter(d => {
      const pvi = d.political.cookPVI;
      if (pvi === 'EVEN') return true;
      const match = pvi.match(/[DR]\+(\d+)/);
      return match && parseInt(match[1] || '0') <= 5;
    }).length,
  };

  // Get top districts by various metrics
  const topByPopulation = [...filteredDistricts]
    .sort((a, b) => b.demographics.population - a.demographics.population)
    .slice(0, 5);

  const topByIncome = [...filteredDistricts]
    .sort((a, b) => b.demographics.medianIncome - a.demographics.medianIncome)
    .slice(0, 5);

  const mostUrban = [...filteredDistricts]
    .sort((a, b) => b.demographics.urbanPercentage - a.demographics.urbanPercentage)
    .slice(0, 5);

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {selectedState && selectedState !== 'all'
            ? `${selectedState} Demographics`
            : 'National Demographics Overview'}
        </h2>
        <p className="text-gray-600">
          Comprehensive demographic and political analysis of {stats.totalDistricts} congressional
          districts
        </p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-3xl font-bold text-blue-600">{stats.totalDistricts}</div>
          <p className="text-sm text-gray-600 mt-1">Total Districts</p>
          <p className="text-xs text-gray-500 mt-1">
            D: {stats.democraticDistricts} | R: {stats.republicanDistricts}
          </p>
        </div>

        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-3xl font-bold text-green-600">
            {(stats.totalPopulation / 1000000).toFixed(1)}M
          </div>
          <p className="text-sm text-gray-600 mt-1">Total Population</p>
          <p className="text-xs text-gray-500 mt-1">
            Avg: {Math.round(stats.avgPopulation).toLocaleString()}
          </p>
        </div>

        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-3xl font-bold text-purple-600">
            ${Math.round(stats.avgMedianIncome / 1000)}k
          </div>
          <p className="text-sm text-gray-600 mt-1">Avg. Median Income</p>
          <p className="text-xs text-gray-500 mt-1">
            Range: ${Math.round(stats.lowestIncome / 1000)}k - $
            {Math.round(stats.highestIncome / 1000)}k
          </p>
        </div>

        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-3xl font-bold text-orange-600">
            {stats.avgUrbanPercentage.toFixed(0)}%
          </div>
          <p className="text-sm text-gray-600 mt-1">Urban Population</p>
          <p className="text-xs text-gray-500 mt-1">
            Diversity Index: {stats.avgDiversityIndex.toFixed(1)}
          </p>
        </div>
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8 p-4 bg-blue-50 rounded-lg">
        <div className="text-center">
          <div className="text-xl font-semibold text-blue-900">{stats.avgMedianAge.toFixed(1)}</div>
          <p className="text-xs text-blue-700">Median Age</p>
        </div>
        <div className="text-center">
          <div className="text-xl font-semibold text-blue-900">{stats.competitiveDistricts}</div>
          <p className="text-xs text-blue-700">Competitive Districts</p>
        </div>
        <div className="text-center">
          <div className="text-xl font-semibold text-blue-900">{stats.avgTurnout.toFixed(0)}%</div>
          <p className="text-xs text-blue-700">Avg. Voter Turnout</p>
        </div>
        <div className="text-center">
          <div className="text-xl font-semibold text-blue-900">
            {stats.avgElectionMargin.toFixed(1)}%
          </div>
          <p className="text-xs text-blue-700">Avg. Victory Margin</p>
        </div>
        <div className="text-center">
          <div className="text-xl font-semibold text-blue-900">
            {Math.round(
              filteredDistricts.reduce((sum, d) => sum + d.political.registeredVoters, 0) / 1000000
            )}
            M
          </div>
          <p className="text-xs text-blue-700">Registered Voters</p>
        </div>
      </div>

      {/* Rankings Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Most Populous Districts */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
            <Users className="w-4 h-4 mr-2 text-blue-600" />
            Most Populous Districts
          </h3>
          <div className="space-y-2">
            {topByPopulation.map((district, index) => (
              <div key={district.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">
                  {index + 1}. {district.state}-{district.number}
                </span>
                <span className="font-medium text-gray-900">
                  {district.demographics.population.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Highest Income Districts */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
            <Building2 className="w-4 h-4 mr-2 text-green-600" />
            Highest Income Districts
          </h3>
          <div className="space-y-2">
            {topByIncome.map((district, index) => (
              <div key={district.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">
                  {index + 1}. {district.state}-{district.number}
                </span>
                <span className="font-medium text-gray-900">
                  ${district.demographics.medianIncome.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Most Urban Districts */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
            <MapPin className="w-4 h-4 mr-2 text-purple-600" />
            Most Urban Districts
          </h3>
          <div className="space-y-2">
            {mostUrban.map((district, index) => (
              <div key={district.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">
                  {index + 1}. {district.state}-{district.number}
                </span>
                <span className="font-medium text-gray-900">
                  {district.demographics.urbanPercentage.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Political Balance Visualization */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-800 mb-3">Political Balance</h3>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Party Control</span>
          <span className="text-sm text-gray-600">
            D: {((stats.democraticDistricts / stats.totalDistricts) * 100).toFixed(1)}% | R:{' '}
            {((stats.republicanDistricts / stats.totalDistricts) * 100).toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div className="h-full flex">
            <div
              className="bg-blue-600 h-full transition-all duration-500"
              style={{ width: `${(stats.democraticDistricts / stats.totalDistricts) * 100}%` }}
            />
            <div
              className="bg-red-600 h-full transition-all duration-500"
              style={{ width: `${(stats.republicanDistricts / stats.totalDistricts) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
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
    setLoading(true);
    try {
      // Fetch real district data from our representatives API
      // Bust cache on first load to get fresh data
      const url = districts.length === 0 ? '/api/districts/all?bust=true' : '/api/districts/all';
      const response = await fetch(url);
      logger.info('Districts API response', { status: response.status });

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-20">
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
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Congressional Districts</h1>
          <p className="text-xl text-gray-600">
            Explore demographic, political, and geographic data for all U.S. congressional districts
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading districts...</p>
          </div>
        ) : (
          <>
            {/* National Statistics Cards */}
            <NationalStatsCards districts={districts} />

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-64">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                  <input
                    type="text"
                    placeholder="Search by district, representative name, state, or city..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                  <select
                    value={stateFilter}
                    onChange={e => setStateFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
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
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
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
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8 relative">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                National Congressional Overview
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                View the United States with state boundaries and congressional districts. Click on
                states to see senators and district information.
              </p>
              <div className="relative">
                <RealDistrictMapContainer
                  selectedDistrict={selectedDistrict}
                  onDistrictClick={district => {
                    setSelectedDistrict(district.id || '');
                  }}
                  height="500px"
                  showControls={true}
                  enableInteraction={true}
                />
                {/* State Info Panel */}
                <StateInfoPanel state={selectedState} onClose={() => setSelectedState(null)} />
              </div>
            </div>

            {/* Demographics Dashboard */}
            <div className="mb-8">
              <DemographicsDashboard districts={filteredDistricts} selectedState={stateFilter} />
            </div>

            {/* District grid */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {filteredDistricts.length} Districts
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDistricts.map(district => (
                  <DistrictCard key={district.id} district={district} />
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
