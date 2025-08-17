'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useState, useCallback, useMemo, useEffect, lazy } from 'react';
import { useRouter } from 'next/navigation';
import { Representative } from '@/features/representatives/services/congress-api';
import { useRepresentativesByZip } from '@/hooks/useRepresentatives';
import { SearchForm } from './SearchForm';
import { RepresentativeGrid } from './RepresentativeGrid';
import { FilterSidebar } from './FilterSidebar';
import { ErrorState } from '@/components/ui/DataQualityIndicator';

// Lazy load visualization components with dynamic imports for better code splitting
const VotingPatternHeatmap = lazy(() =>
  import('@/shared/components/ui/VotingPatternHeatmap').then(module => ({
    default: module.VotingPatternHeatmap,
  }))
);

const RepresentativeNetwork = lazy(() =>
  import('@/features/representatives/components/RepresentativeNetwork').then(module => ({
    default: module.RepresentativeNetwork,
  }))
);

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

export function RepresentativesClient({
  initialRepresentatives,
  compareIds,
  initialFilters,
}: RepresentativesClientProps) {
  const router = useRouter();

  const [zipCode, setZipCode] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'network'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    chamber: initialFilters?.chamber || 'all',
    party: initialFilters?.party || 'all',
    state: initialFilters?.state || 'all',
    committee: 'all',
  });

  // Use SWR for automatic caching and data fetching
  const {
    representatives: swrRepresentatives,
    metadata,
    isLoading,
    error,
    refetch,
  } = useRepresentativesByZip(zipCode);

  // Use initial representatives from server-side props, then switch to SWR data when available
  const representatives =
    zipCode && swrRepresentatives.length > 0 ? swrRepresentatives : initialRepresentatives;
  const [filteredReps, setFilteredReps] = useState<Representative[]>(representatives);

  const handleZipSearch = (zip: string) => {
    setZipCode(zip);
  };

  const handleFilterChange = useCallback(
    (filters: FilterState) => {
      let filtered = [...representatives];

      if (filters.chamber !== 'all') {
        filtered = filtered.filter(r => r.chamber === filters.chamber);
      }
      if (filters.party !== 'all') {
        filtered = filtered.filter(r => r.party === filters.party);
      }
      if (filters.state !== 'all') {
        filtered = filtered.filter(r => r.state === filters.state);
      }
      if (filters.committee !== 'all') {
        filtered = filtered.filter(r => r.committees?.some(c => c.name === filters.committee));
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
    [representatives, searchTerm]
  );

  // Update filtered reps when representatives change
  useEffect(() => {
    if (initialFilters) {
      handleFilterChange(filters);
    } else {
      setFilteredReps(representatives);
    }
  }, [representatives, filters, initialFilters, handleFilterChange]);

  const searchFilteredReps = useMemo(() => {
    if (!searchTerm) return representatives;

    const lowerSearchTerm = searchTerm.toLowerCase();
    return representatives.filter(
      rep =>
        rep.name.toLowerCase().includes(lowerSearchTerm) ||
        rep.state.toLowerCase().includes(lowerSearchTerm) ||
        (rep.district && rep.district.includes(searchTerm))
    );
  }, [representatives, searchTerm]);

  useEffect(() => {
    setFilteredReps(searchFilteredReps);
  }, [searchFilteredReps]);

  const generateNetworkData = () => {
    const nodes = filteredReps.slice(0, 30).map(rep => ({
      id: rep.bioguideId,
      name: rep.name,
      party: rep.party === 'D' ? 'Democratic' : 'Republican',
      group: rep.chamber === 'Senate' ? 0 : 1,
    }));

    const links = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const rep1 = filteredReps[i];
        const rep2 = filteredReps[j];
        const node1 = nodes[i];
        const node2 = nodes[j];

        // Skip if any required data is undefined
        if (!rep1 || !rep2 || !node1 || !node2) continue;

        const sharedCommittees =
          rep1.committees?.filter(c1 => rep2.committees?.some(c2 => c1.name === c2.name))?.length ||
          0;

        if (sharedCommittees > 0) {
          links.push({
            source: node1.id,
            target: node2.id,
            value: sharedCommittees * 3,
          });
        }
      }
    }

    return { nodes, links };
  };

  const generateVotingData = () => {
    // Voting data unavailable - would require real voting records from Congress.gov
    // Returning empty array until real vote data is available
    return [];
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Loading representatives...</p>
      </div>
    );
  }

  if (error) {
    return <ErrorState error={error} onRetry={() => refetch()} />;
  }

  return (
    <>
      <SearchForm onSearch={handleZipSearch} apiMetadata={metadata || undefined} />

      {/* Search and view controls */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Filter by name, state, or district..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
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
              className={`px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('network')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'network'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Network
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
            representatives={representatives}
            initialFilters={filters}
          />
        </div>

        {/* Main content */}
        <div className="flex-1">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-gray-600">
              Showing {filteredReps.length} of {representatives.length} representatives
            </p>
          </div>

          {viewMode === 'grid' && (
            <RepresentativeGrid representatives={filteredReps} compareIds={compareIds} />
          )}

          {viewMode === 'list' && (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
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
                      <tr key={rep.bioguideId} className="hover:bg-gray-50">
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

          {viewMode === 'network' && (
            <div className="space-y-8">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Representative Network</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Network visualization showing committee relationships between representatives
                </p>
                <RepresentativeNetwork {...generateNetworkData()} width={900} height={600} />
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Voting Patterns</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Recent voting patterns across key legislation
                </p>
                <VotingPatternHeatmap data={generateVotingData()} width={900} height={400} />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
