'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useCallback, useMemo, useEffect, lazy } from 'react';
import { useRouter } from 'next/navigation';
import { Representative } from '@/features/representatives/services/congress-api';
import { SearchForm } from './SearchForm';
import { RepresentativeGrid } from './RepresentativeGrid';
import { FilterSidebar } from './FilterSidebar';
import { ErrorState } from '@/components/shared/ui/DataQualityIndicator';
import { useRepresentativesStore, useUIStore } from '@/store';

// Lazy load visualization components with dynamic imports for better code splitting
const _VotingPatternHeatmap = lazy(() =>
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
}

export function RepresentativesClientWithStore({
  initialRepresentatives,
  compareIds,
}: RepresentativesClientProps) {
  const router = useRouter();

  // Zustand stores
  const {
    representatives,
    filters,
    loading,
    error,
    setRepresentatives,
    setFilters,
    setLoading,
    setError,
    getFilteredRepresentatives,
  } = useRepresentativesStore();

  const { activeTab, setActiveTab, addNotification } = useUIStore();

  // Use active tab for view mode
  const viewMode = (activeTab as 'grid' | 'list' | 'network') || 'grid';

  // Custom fetch function for ZIP code search
  const fetchRepresentativesByZip = async (zipCode: string) => {
    const response = await fetch(`/api/representatives?zip=${zipCode}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch representatives for ZIP ${zipCode}`);
    }
    const data = await response.json();
    return data.representatives || [];
  };

  // Initialize representatives on mount
  useEffect(() => {
    if (initialRepresentatives.length > 0 && representatives.length === 0) {
      setRepresentatives(initialRepresentatives);
    }
  }, [initialRepresentatives, representatives.length, setRepresentatives]);

  // Handle ZIP code search
  const handleZipSearch = useCallback(
    async (zip: string) => {
      setLoading(true);
      setError(null);
      setFilters({ searchQuery: zip });

      try {
        const fetchedReps = await fetchRepresentativesByZip(zip);
        setRepresentatives(fetchedReps);

        addNotification({
          type: 'success',
          message: `Found representatives for ZIP code ${zip}`,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to fetch representatives';
        setError(errorMessage);

        addNotification({
          type: 'error',
          message: errorMessage,
        });
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setError, setFilters, addNotification, setRepresentatives]
  );

  // Handle compare functionality
  const _handleCompare = useCallback(
    (id: string) => {
      const newCompareIds = compareIds.includes(id)
        ? compareIds.filter(compareId => compareId !== id)
        : [...compareIds, id];

      // Update URL with compare IDs
      const params = new URLSearchParams();
      newCompareIds.forEach(compareId => params.append('compare', compareId));
      router.push(`/representatives?${params.toString()}`);

      addNotification({
        type: 'info',
        message: compareIds.includes(id) ? 'Removed from comparison' : 'Added to comparison',
      });
    },
    [compareIds, router, addNotification]
  );

  // Get filtered representatives
  const filteredRepresentatives = useMemo(() => {
    return getFilteredRepresentatives();
  }, [getFilteredRepresentatives]);

  // Determine which representatives to display
  const displayRepresentatives = filteredRepresentatives;

  // Calculate stats for display
  const stats = useMemo(() => {
    const dems = displayRepresentatives.filter((r: Representative) => r.party === 'D').length;
    const reps = displayRepresentatives.filter((r: Representative) => r.party === 'R').length;
    const senate = displayRepresentatives.filter(
      (r: Representative) => r.chamber === 'Senate'
    ).length;
    const house = displayRepresentatives.filter(
      (r: Representative) => r.chamber === 'House'
    ).length;

    return { dems, reps, senate, house };
  }, [displayRepresentatives]);

  // Check if we're loading (either from store or zip search)
  const _isLoading = loading;
  const displayError = error;

  // View mode change handler
  const handleViewModeChange = (mode: string) => {
    setActiveTab(mode);
  };

  if (displayError) {
    return (
      <ErrorState
        error={
          typeof displayError === 'string'
            ? { code: 'FETCH_ERROR', message: displayError }
            : displayError
        }
        onRetry={() => {
          if (filters.searchQuery) {
            handleZipSearch(filters.searchQuery);
          }
        }}
      />
    );
  }

  return (
    <div>
      {/* Search Form */}
      <SearchForm onSearch={handleZipSearch} />

      <div className="flex gap-6">
        {/* Filter Sidebar */}
        <FilterSidebar onFilterChange={setFilters} representatives={displayRepresentatives} />

        {/* Main Content */}
        <div className="flex-1">
          {/* View Mode Tabs */}
          <div className="mb-4 border-b">
            <nav className="-mb-px flex space-x-8">
              {(['grid', 'list', 'network'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => handleViewModeChange(mode)}
                  className={`
                    py-2 px-1 border-b-2 font-medium text-sm capitalize
                    ${
                      viewMode === mode
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  {mode} View
                </button>
              ))}
            </nav>
          </div>

          {/* Stats Summary */}
          <div className="mb-6 grid grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Democrats</p>
              <p className="text-2xl font-bold text-blue-600">{stats.dems}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Republicans</p>
              <p className="text-2xl font-bold text-red-600">{stats.reps}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Senate</p>
              <p className="text-2xl font-bold text-purple-600">{stats.senate}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">House</p>
              <p className="text-2xl font-bold text-green-600">{stats.house}</p>
            </div>
          </div>

          {/* Content based on view mode */}
          {viewMode === 'grid' && (
            <RepresentativeGrid representatives={displayRepresentatives} compareIds={compareIds} />
          )}

          {viewMode === 'list' && (
            <RepresentativeGrid representatives={displayRepresentatives} compareIds={compareIds} />
          )}

          {viewMode === 'network' && displayRepresentatives.length > 0 && (
            <RepresentativeNetwork
              nodes={displayRepresentatives.map(rep => ({
                id: rep.bioguideId,
                name: rep.name,
                party: rep.party,
                group: rep.party === 'D' ? 1 : rep.party === 'R' ? 2 : 0,
              }))}
              links={[]}
            />
          )}
        </div>
      </div>
    </div>
  );
}
