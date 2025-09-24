'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Representative } from '@/features/representatives/services/congress-api';
import { SearchForm } from './SearchForm';
import { RepresentativeGrid } from './RepresentativeGrid';
import { FilterSidebar } from './FilterSidebar';
import { ErrorState } from '@/components/shared/ui/DataQualityIndicator';
import CongressHeader from './CongressHeader';
import { AddressPrompt } from './AddressPrompt';
import { DistrictHeader } from '@/components/DistrictHeader';
import { DistrictInfo } from '@/lib/multi-district/detection';
import logger from '@/lib/logging/simple-logger';

interface RepresentativesClientProps {
  initialRepresentatives: Representative[];
  compareIds: string[];
  initialFilters?: {
    chamber?: string;
    party?: string;
    state?: string;
  };
}

interface FilterState {
  chamber: string;
  party: string;
  state: string;
  committee: string;
}

// New simplified search state interface
interface SearchState {
  isLoading: boolean;
  error: string | null;
  zipCode: string | null;
  isMultiDistrict: boolean;
  districts: DistrictInfo[];
  representatives: Representative[];
  selectedDistrictInfo: DistrictInfo | null;
  showAddressPrompt: boolean;
}

/**
 * Normalizes district identifiers for consistent comparison.
 * Handles various formats including numeric districts and at-large representations.
 *
 * @param d - The district identifier (can be null, undefined, or string)
 * @returns A normalized value for comparison (number for numeric districts, 'AT_LARGE' for at-large)
 */
const normalizeDistrict = (d: string | null | undefined): string | number => {
  // Handle null, undefined, and common at-large string formats
  if (!d || d === 'AL' || d === 'At-Large' || d === '00' || d === '0') {
    return 'AT_LARGE';
  }

  // Handle numeric districts like "2" or "02"
  const parsed = parseInt(d, 10);

  // If parsing fails (e.g., for an unexpected format), fallback to the original string
  // Special case: if parsed is 0, treat as at-large (handles edge case where "0" wasn't caught above)
  if (isNaN(parsed)) {
    return d;
  }
  return parsed === 0 ? 'AT_LARGE' : parsed;
};

export function RepresentativesClient({
  initialRepresentatives,
  compareIds,
  initialFilters,
}: RepresentativesClientProps) {
  const router = useRouter();

  // Simplified state management - single source of truth
  const [searchState, setSearchState] = useState<SearchState>({
    isLoading: false,
    error: null,
    zipCode: null,
    isMultiDistrict: false,
    districts: [],
    representatives: initialRepresentatives,
    selectedDistrictInfo: null,
    showAddressPrompt: false,
  });

  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'network'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    chamber: initialFilters?.chamber || 'all',
    party: initialFilters?.party || 'all',
    state: initialFilters?.state || 'all',
    committee: 'all',
  });

  const [filteredReps, setFilteredReps] = useState<Representative[]>(searchState.representatives);

  // Updated handleZipSearch to use multi-district API as primary source
  const handleZipSearch = async (zip: string) => {
    setSearchState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      zipCode: zip,
    }));

    try {
      // Use the multi-district API as primary source of truth
      const response = await fetch(
        `/api/representatives-multi-district?zip=${encodeURIComponent(zip)}`
      );

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to fetch representatives');
      }

      // Update state based on API response
      setSearchState(prev => ({
        ...prev,
        isLoading: false,
        isMultiDistrict: data.isMultiDistrict,
        districts: data.districts || [],
        representatives: data.representatives || [],
        showAddressPrompt: data.isMultiDistrict,
        selectedDistrictInfo: null, // Reset selection
      }));

      logger.info('ZIP search completed', {
        zip,
        isMultiDistrict: data.isMultiDistrict,
        districtCount: data.districts?.length || 0,
        representativeCount: data.representatives?.length || 0,
      });
    } catch (error) {
      logger.error('ZIP search failed', error as Error, { zip });
      setSearchState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to search representatives',
      }));
    }
  };

  const handleDistrictSelect = async (district: DistrictInfo) => {
    if (!searchState.zipCode) return;

    try {
      setSearchState(prev => ({ ...prev, isLoading: true }));

      // Fetch representatives for specific district
      const response = await fetch(
        `/api/representatives-multi-district?zip=${encodeURIComponent(searchState.zipCode)}&district=${district.state}-${district.district}`
      );

      const data = await response.json();

      if (data.success && data.representatives) {
        setSearchState(prev => ({
          ...prev,
          isLoading: false,
          selectedDistrictInfo: district,
          representatives: data.representatives,
          showAddressPrompt: false,
        }));

        logger.info('District selected', {
          zipCode: searchState.zipCode,
          district: `${district.state}-${district.district}`,
          representativeCount: data.representatives.length,
        });
      } else {
        throw new Error(data.error?.message || 'Failed to fetch district representatives');
      }
    } catch (error) {
      logger.error('District selection failed', error as Error, {
        zipCode: searchState.zipCode,
        district: `${district.state}-${district.district}`,
      });
      setSearchState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to select district',
      }));
    }
  };

  const handleAddressSubmit = async (address: string) => {
    if (!searchState.zipCode) return;

    try {
      setSearchState(prev => ({ ...prev, isLoading: true }));

      const response = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'address',
          address,
          zipCode: searchState.zipCode,
        }),
      });

      const data = await response.json();

      if (data.success && data.district) {
        // Find the district from our available districts
        const matchingDistrict = searchState.districts.find(
          d => d.state === data.district.state && d.district === data.district.district
        );

        if (matchingDistrict) {
          await handleDistrictSelect(matchingDistrict);
        } else {
          throw new Error('District not found in available options');
        }
      } else {
        throw new Error(data.error?.message || 'Could not determine district from address');
      }
    } catch (error) {
      logger.error('Address geocoding failed', error as Error, { address });
      setSearchState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to geocode address',
      }));
    }
  };

  const handleCloseAddressPrompt = () => {
    setSearchState(prev => ({
      ...prev,
      showAddressPrompt: false,
    }));
  };

  const handleFilterChange = useCallback(
    (newFilters: FilterState) => {
      let filtered = [...searchState.representatives];

      if (newFilters.chamber !== 'all') {
        const chamberMapping: Record<string, string> = {
          house: 'House',
          senate: 'Senate',
        };
        const actualChamber = chamberMapping[newFilters.chamber] || newFilters.chamber;
        filtered = filtered.filter(r => r.chamber === actualChamber);
      }
      if (newFilters.party !== 'all') {
        filtered = filtered.filter(r => r.party === newFilters.party);
      }
      if (newFilters.state !== 'all') {
        filtered = filtered.filter(r => r.state === newFilters.state);
      }
      if (newFilters.committee !== 'all') {
        filtered = filtered.filter(r => r.committees?.some(c => c.name === newFilters.committee));
      }

      // Filter by selected district when one is chosen
      if (searchState.selectedDistrictInfo) {
        const selectedDistrict = searchState.selectedDistrictInfo;
        filtered = filtered.filter(
          rep =>
            rep.chamber === 'Senate' || // Always include Senators
            (rep.chamber === 'House' &&
              rep.state === selectedDistrict.state &&
              normalizeDistrict(rep.district) === normalizeDistrict(selectedDistrict.district))
        );
      }

      if (searchTerm) {
        filtered = filtered.filter(
          rep =>
            rep.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            rep.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (rep.district && rep.district.includes(searchTerm))
        );
      }

      setFilteredReps(filtered);
    },
    [searchState.representatives, searchState.selectedDistrictInfo, searchTerm]
  );

  // Update filtered reps when representatives or filters change
  useEffect(() => {
    handleFilterChange(filters);
  }, [searchState.representatives, filters, handleFilterChange]);

  if (searchState.isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Loading representatives...</p>
      </div>
    );
  }

  if (searchState.error) {
    return (
      <ErrorState
        error={{ code: 'SEARCH_ERROR', message: searchState.error }}
        onRetry={() => handleZipSearch(searchState.zipCode || '')}
      />
    );
  }

  return (
    <>
      <SearchForm onSearch={handleZipSearch} />

      {/* Multi-district Address Prompt - now controlled by API response */}
      {searchState.showAddressPrompt && searchState.isMultiDistrict && (
        <AddressPrompt
          isOpen={searchState.showAddressPrompt}
          onClose={handleCloseAddressPrompt}
          zipCode={searchState.zipCode || ''}
          districts={searchState.districts}
          onAddressSubmit={handleAddressSubmit}
          onDistrictSelect={handleDistrictSelect}
        />
      )}

      {/* Conditional Header: District-specific or Congress-wide */}
      {searchState.zipCode && (searchState.selectedDistrictInfo || !searchState.isMultiDistrict) ? (
        <DistrictHeader zipCode={searchState.zipCode || ''} />
      ) : (
        <CongressHeader
          chamber={filters.chamber as 'all' | 'house' | 'senate'}
          onChamberChange={chamber => {
            const newFilters = { ...filters, chamber };
            setFilters(newFilters);
            handleFilterChange(newFilters);

            // Update URL to reflect the chamber filter
            const params = new URLSearchParams(window.location.search);
            if (chamber === 'all') {
              params.delete('chamber');
            } else {
              params.set('chamber', chamber);
            }
            const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
            router.push(newUrl);
          }}
        />
      )}

      {/* Search and view controls */}
      <div className="bg-white border-2 border-black p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Filter by name, state, or district..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 focus:outline-none focus:border-blue-500"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-4 py-2 transition-colors ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-200'
              }`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0 hidden lg:block">
          <FilterSidebar
            onFilterChange={newFilters => {
              setFilters(newFilters);
              handleFilterChange(newFilters);
            }}
            representatives={searchState.representatives}
            initialFilters={filters}
          />
        </div>

        {/* Main content */}
        <div className="flex-1">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-gray-600">
              Showing {filteredReps.length} of {searchState.representatives.length} representatives
            </p>
          </div>

          {viewMode === 'grid' && (
            <RepresentativeGrid representatives={filteredReps} compareIds={compareIds} />
          )}

          {viewMode === 'list' && (
            <div className="bg-white border-2 border-black overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-white">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Representative
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        State/District
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Party
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Chamber
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredReps.map(rep => (
                      <tr key={rep.bioguideId} className="hover:bg-white">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{rep.name}</div>
                              <div className="text-sm text-gray-500">{rep.chamber}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {rep.state}
                          {rep.district && `-${rep.district}`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              rep.party === 'D'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {rep.party}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {rep.chamber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => router.push(`/representative/${rep.bioguideId}`)}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
