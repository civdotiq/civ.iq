'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState, Suspense, useCallback } from 'react';
import { CiviqLogo } from '@/shared/components/branding/CiviqLogo';
import { RepresentativeCard } from '@/features/representatives/components/RepresentativeCard';
import { StateRepresentativesTab } from '@/features/representatives/components/StateRepresentativesTab';
import { SearchHistory } from '@/lib/searchHistory';
import { SearchResultsSkeleton } from '@/shared/components/ui/SkeletonComponents';
import { LoadingStateWrapper, LoadingMessage } from '@/shared/components/ui/LoadingStates';
import { useMultiStageLoading } from '@/hooks/shared/useSmartLoading';
import { InteractiveDistrictMap } from '@/features/districts/components/InteractiveDistrictMap';
import { DataQualityIndicator, DataSourceBadge } from '@/components/shared/ui/DataQualityIndicator';
import {
  InlineQualityScore,
  DataTrustIndicator,
} from '@/shared/components/ui/DataQualityDashboard';
import { DistrictSelector } from '@/features/districts/components/DistrictSelector';
import { AddressRefinement } from '@/features/districts/components/AddressRefinement';
import {
  checkMultiDistrict,
  DistrictInfo,
  MultiDistrictResponse,
} from '@/lib/multi-district/detection';

interface Representative {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district?: string;
  chamber: 'House' | 'Senate';
  title: string;
  phone?: string;
  email?: string;
  website?: string;
  committees?: Array<{
    name: string;
    role?: string;
  }>;
  terms?: Array<{
    congress: string;
    startYear: string;
    endYear: string;
  }>;
  yearsInOffice?: number;
  nextElection?: string;
  imageUrl?: string;
  dataComplete: number;
}

interface MultiDistrictRepresentative {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district?: string;
  chamber: string;
  title: string;
  phone?: string;
  website?: string;
}

interface ApiResponse {
  success: boolean;
  representatives?: Representative[];
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata: {
    timestamp: string;
    zipCode: string;
    dataQuality: 'high' | 'medium' | 'low' | 'unavailable';
    dataSource: string;
    cacheable: boolean;
    freshness?: string;
  };
}

function ResultsContent() {
  const searchParams = useSearchParams();
  const zipCode = searchParams.get('zip');
  const address = searchParams.get('address');
  const query = searchParams.get('q');
  const [data, setData] = useState<ApiResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'federal' | 'state' | 'map'>('federal');
  const [useInteractiveMap, setUseInteractiveMap] = useState(true);
  const [districtInfo, setDistrictInfo] = useState<{ state: string; district: string } | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchType, setSearchType] = useState<'zip' | 'address' | 'unknown'>('unknown');
  const [multiDistrictData, setMultiDistrictData] = useState<MultiDistrictResponse | null>(null);
  const [showAddressRefinement, setShowAddressRefinement] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictInfo | null>(null);
  const [_error, setError] = useState<string | null>(null);

  // Multi-stage loading for the search process
  const loading = useMultiStageLoading([
    'Analyzing search query...',
    'Checking district boundaries...',
    'Looking up representatives...',
    'Loading additional data...',
    'Finalizing results...',
  ]);

  // Extract methods to avoid infinite loop
  const {
    start: startLoading,
    setError: setLoadingError,
    nextStage,
    complete: completeLoading,
  } = loading;

  const fetchRepresentatives = useCallback(
    async (selectedDistrictOverride?: DistrictInfo) => {
      const searchQuery = query || zipCode || address;
      if (!searchQuery) {
        setLoadingError(new Error('No search query provided'));
        completeLoading(); // ADD: Complete loading when no search query
        return;
      }

      // Failsafe timeout to prevent infinite loading
      const loadingTimeout = setTimeout(() => {
        completeLoading();
      }, 15000); // 15 second failsafe

      try {
        startLoading();
        setSearchQuery(searchQuery);

        // Determine search type
        const isZipCode = /^\d{5}$/.test(searchQuery);
        const currentSearchType = isZipCode ? 'zip' : 'address';
        setSearchType(currentSearchType);

        // For ZIP codes, check if multi-district first
        if (isZipCode && !selectedDistrictOverride) {
          nextStage(); //"Checking district boundaries..."
          const multiDistrictCheck = await checkMultiDistrict(searchQuery);

          if (multiDistrictCheck.success && multiDistrictCheck.isMultiDistrict) {
            // Multi-district ZIP - show district selector
            setMultiDistrictData(multiDistrictCheck);
            clearTimeout(loadingTimeout); // Clear timeout before completing
            completeLoading();
            return;
          } else if (multiDistrictCheck.success && !multiDistrictCheck.isMultiDistrict) {
            // Single district - continue with normal flow using multi-district API for consistency
            nextStage(); //"Looking up representatives..."
            const response = await fetch(
              `/api/representatives-multi-district?zip=${encodeURIComponent(searchQuery)}`
            );
            const apiData: MultiDistrictResponse = await response.json();

            if (apiData.success && apiData.representatives) {
              // Convert multi-district response to legacy format
              const legacyData: ApiResponse = {
                success: true,
                representatives: (apiData.representatives as MultiDistrictRepresentative[]).map(
                  rep => ({
                    bioguideId: rep.bioguideId,
                    name: rep.name,
                    party: rep.party,
                    state: rep.state,
                    district: rep.district,
                    chamber: rep.chamber as 'House' | 'Senate',
                    title: rep.title,
                    phone: rep.phone,
                    email: '', // Not in multi-district response
                    website: rep.website,
                    committees: [],
                    terms: [],
                    yearsInOffice: 0,
                    nextElection: '',
                    imageUrl: '',
                    dataComplete: 85,
                  })
                ),
                metadata: {
                  timestamp: apiData.metadata.timestamp,
                  zipCode: searchQuery,
                  dataQuality: apiData.metadata.coverage.dataQuality as
                    | 'high'
                    | 'medium'
                    | 'low'
                    | 'unavailable',
                  dataSource: apiData.metadata.dataSource,
                  cacheable: true,
                  freshness: 'live',
                },
              };

              nextStage(); //"Loading additional data..."
              setData(legacyData);

              // Set district info
              if (apiData.primaryDistrict) {
                setDistrictInfo({
                  state: apiData.primaryDistrict.state,
                  district: apiData.primaryDistrict.district,
                });
              }

              clearTimeout(loadingTimeout); // Clear timeout before completing
              completeLoading();
              return;
            } else {
              // API failed or no representatives found
              setError(apiData.error?.message || 'No representatives found');
              clearTimeout(loadingTimeout);
              completeLoading();
              return;
            }
          }
        }

        // Handle selected district override (user chose from multi-district)
        if (selectedDistrictOverride) {
          const response = await fetch(
            `/api/representatives-multi-district?zip=${encodeURIComponent(searchQuery)}&district=${selectedDistrictOverride.state}-${selectedDistrictOverride.district}`
          );
          const apiData: MultiDistrictResponse = await response.json();

          if (apiData.success && apiData.representatives) {
            // Convert to legacy format and continue
            const legacyData: ApiResponse = {
              success: true,
              representatives: (apiData.representatives as MultiDistrictRepresentative[]).map(
                rep => ({
                  bioguideId: rep.bioguideId,
                  name: rep.name,
                  party: rep.party,
                  state: rep.state,
                  district: rep.district,
                  chamber: rep.chamber as 'House' | 'Senate',
                  title: rep.title,
                  phone: rep.phone,
                  email: '',
                  website: rep.website,
                  committees: [],
                  terms: [],
                  yearsInOffice: 0,
                  nextElection: '',
                  imageUrl: '',
                  dataComplete: 85,
                })
              ),
              metadata: {
                timestamp: apiData.metadata.timestamp,
                zipCode: searchQuery,
                dataQuality: apiData.metadata.coverage.dataQuality as
                  | 'high'
                  | 'medium'
                  | 'low'
                  | 'unavailable',
                dataSource: apiData.metadata.dataSource,
                cacheable: true,
                freshness: 'live',
              },
            };

            setData(legacyData);
            setError(null);
            setMultiDistrictData(null); // Clear multi-district selector
            setSelectedDistrict(selectedDistrictOverride);

            // Set district info
            setDistrictInfo({
              state: selectedDistrictOverride.state,
              district: selectedDistrictOverride.district,
            });

            clearTimeout(loadingTimeout); // Clear timeout before completing
            completeLoading();
            return;
          } else {
            // API failed for selected district
            setError(
              apiData.error?.message || 'Failed to fetch representatives for selected district'
            );
            clearTimeout(loadingTimeout);
            completeLoading();
            return;
          }
        }

        // Fallback to original search system for non-ZIP or failed cases
        // Use unified search endpoint for all search types
        const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        const searchData = await response.json();

        // Convert unified search response to legacy format
        const apiData: ApiResponse = {
          success: response.ok && searchData.results && searchData.results.length > 0,
          representatives: searchData.results || [],
          error: !response.ok ? { code: 'SEARCH_ERROR', message: 'Search failed' } : undefined,
          metadata: {
            timestamp: new Date().toISOString(),
            zipCode: searchQuery,
            dataQuality: 'high',
            dataSource: 'unified-search',
            cacheable: true,
          },
        };

        setData(apiData);

        if (apiData.success && apiData.representatives && apiData.representatives.length > 0) {
          setError(null);

          // Extract district info from first representative
          const firstRep = apiData.representatives[0];
          if (firstRep) {
            setDistrictInfo({
              state: firstRep.state,
              district: firstRep.district || '00',
            });

            // Update search history with location info
            if (typeof window !== 'undefined') {
              const displayName = `${firstRep.state}${firstRep.district && firstRep.district !== '00' ? ` District ${firstRep.district}` : ''}`;
              SearchHistory.updateSearchDisplayName(query || '', displayName);
            }
          }
          clearTimeout(loadingTimeout); // Clear timeout before completing
          completeLoading();
        } else {
          // Handle API error or empty results
          setError(apiData.error?.message || 'No representatives found for this location');
          clearTimeout(loadingTimeout);
          completeLoading();
        }
      } catch (err) {
        clearTimeout(loadingTimeout); // Clear timeout first
        completeLoading(); // Complete loading before setting error
        setLoadingError(err instanceof Error ? err : new Error('Network error occurred'));
        setData({
          success: false,
          error: {
            code: 'NETWORK_ERROR',
            message: 'Unable to connect to server',
          },
          metadata: {
            timestamp: new Date().toISOString(),
            zipCode: zipCode || '',
            dataQuality: 'unavailable' as const,
            dataSource: 'network-error',
            cacheable: false,
          },
        });
      } finally {
        // Failsafe: ensure timeout is always cleared
        clearTimeout(loadingTimeout);
      }
    },
    [
      query,
      zipCode,
      address,
      startLoading,
      setLoadingError,
      nextStage,
      completeLoading,
      setSearchQuery,
      setSearchType,
      setMultiDistrictData,
      setData,
      setError,
      setSelectedDistrict,
      setDistrictInfo,
    ]
  );

  const handleDistrictSelect = async (district: DistrictInfo) => {
    // Fetch representatives for selected district instead of navigating away
    setSelectedDistrict(district);
    setMultiDistrictData(null); // Clear multi-district selector
    setShowAddressRefinement(false); // Hide address refinement if shown

    // Use the existing fetchRepresentatives function with district override
    await fetchRepresentatives(district);
  };

  const handleAddressRefinement = () => {
    setShowAddressRefinement(true);
  };

  const handleAddressSuccess = async (state: string, district: string, address: string) => {
    // Create district info from geocoded result and fetch representatives in-place
    const geocodedDistrict: DistrictInfo = {
      state,
      district,
      primary: true,
      confidence: 'high',
    };

    setSelectedDistrict(geocodedDistrict);
    setMultiDistrictData(null); // Clear multi-district selector
    setShowAddressRefinement(false); // Hide address refinement form

    // Update search query to show the address that was used
    setSearchQuery(address);
    setSearchType('address');

    // Fetch representatives for the geocoded district
    await fetchRepresentatives(geocodedDistrict);
  };

  const handleAddressCancel = () => {
    setShowAddressRefinement(false);
  };

  useEffect(() => {
    if (zipCode || address || query) {
      fetchRepresentatives();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zipCode, address, query]);

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-2 border-black border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <CiviqLogo />
            </Link>
            <div className="flex items-center gap-4">
              {/* Quick search history in header */}
              <div className="hidden md:flex items-center gap-2">
                {typeof window !== 'undefined' &&
                  SearchHistory.getHistory()
                    .slice(0, 3)
                    .map((item, index) => (
                      <Link
                        key={`header-${item.zipCode}-${index}`}
                        href={`/results?zip=${encodeURIComponent(item.zipCode)}`}
                        className="px-2 py-1 text-xs bg-white border-2 border-gray-300 hover:bg-gray-200 rounded text-gray-700 transition-colors"
                      >
                        {item.zipCode}
                      </Link>
                    ))}
              </div>
              <div className="flex items-center gap-4">
                <Link
                  href="/compare"
                  className="text-civiq-green hover:text-civiq-green/80 text-sm font-medium"
                >
                  Compare Representatives
                </Link>
                <Link
                  href="/"
                  className="text-civiq-blue hover:text-civiq-blue/80 text-sm font-medium"
                >
                  ← New Search
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Representatives</h1>
          <p className="text-gray-600">
            Representatives for {searchType === 'zip' ? 'ZIP code' : 'address'}{' '}
            <span className="font-semibold">{searchQuery}</span>
            {selectedDistrict && (
              <span className="ml-2 text-civiq-blue font-semibold">
                • {selectedDistrict.state}-{selectedDistrict.district} Selected
              </span>
            )}
            {districtInfo && !selectedDistrict && (
              <span className="ml-2">
                • {districtInfo.state}{' '}
                {districtInfo.district &&
                  districtInfo.district !== '00' &&
                  `District ${districtInfo.district}`}
              </span>
            )}
            {multiDistrictData && !selectedDistrict && (
              <span className="ml-2 text-orange-600">
                • Multiple districts found - please select
              </span>
            )}
          </p>

          {/* Data Quality Indicator */}
          {data?.metadata && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-3 text-sm flex-wrap">
                <DataQualityIndicator
                  quality={data.metadata?.dataQuality}
                  source={data.metadata?.dataSource}
                  freshness={data.metadata?.freshness}
                />
                <DataSourceBadge source={data.metadata?.dataSource} showTrustLevel={true} />
                <InlineQualityScore
                  score={85}
                  label="Data Quality"
                  showTrend={true}
                  trend="stable"
                />
                <DataTrustIndicator
                  sources={data.metadata?.dataSource ? [data.metadata.dataSource] : []}
                />
              </div>
              <div className="text-xs text-gray-500">
                Retrieved:{' '}
                {data.metadata?.timestamp
                  ? new Date(data.metadata.timestamp).toLocaleString()
                  : 'Unknown'}{' '}
                • Status: validated • Cacheable: {data.metadata.cacheable ? 'yes' : 'no'}
              </div>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        {(zipCode || query) && (
          <div className="bg-white border border-gray-200 overflow-hidden mb-8">
            <div className="border-b border-gray-200">
              <nav className="flex">
                <button
                  onClick={() => setActiveTab('federal')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 ${
                    activeTab === 'federal'
                      ? 'border-civiq-blue text-civiq-blue'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Federal Representatives
                </button>
                <button
                  onClick={() => setActiveTab('state')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 ${
                    activeTab === 'state'
                      ? 'border-civiq-blue text-civiq-blue'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  State Representatives
                </button>
                <button
                  onClick={() => setActiveTab('map')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 ${
                    activeTab === 'map'
                      ? 'border-civiq-blue text-civiq-blue'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  District Map
                </button>
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'federal' && (
                <>
                  {/* Multi-District Selection */}
                  {multiDistrictData && !showAddressRefinement && (
                    <div className="mb-8">
                      <DistrictSelector
                        zipCode={multiDistrictData.zipCode}
                        districts={multiDistrictData.districts}
                        representatives={multiDistrictData.representatives as Representative[]}
                        onSelect={handleDistrictSelect}
                        onRefineAddress={handleAddressRefinement}
                      />
                    </div>
                  )}

                  {/* Address Refinement */}
                  {showAddressRefinement && (
                    <div className="mb-8">
                      <AddressRefinement
                        zipCode={searchQuery}
                        onSuccess={handleAddressSuccess}
                        onCancel={handleAddressCancel}
                      />
                    </div>
                  )}

                  {loading.loading && !(multiDistrictData && !showAddressRefinement) && (
                    <LoadingStateWrapper
                      loading={loading.loading}
                      error={loading.error}
                      retry={loading.retry}
                      loadingComponent={
                        <>
                          <LoadingMessage
                            message={loading.currentStage || 'Loading...'}
                            submessage={`Step ${loading.currentStageIndex + 1} of 5`}
                            className="mb-8"
                          />
                          <SearchResultsSkeleton count={3} />
                        </>
                      }
                      loadingMessage={loading.currentStage}
                    >
                      <div></div>
                    </LoadingStateWrapper>
                  )}

                  {loading.error && (
                    <div className="bg-red-50 border border-red-200 p-6 text-center">
                      <div className="text-red-500 mb-4">
                        <svg
                          className="w-12 h-12 mx-auto"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <p className="text-red-800 font-medium">Unable to find representatives</p>
                      <p className="text-red-600 mt-1">{loading.error.message}</p>
                      <div className="flex gap-4 justify-center mt-4">
                        <button
                          onClick={() => loading.retry()}
                          className="px-4 py-2 bg-civiq-blue text-white hover:bg-blue-700 transition-colors"
                        >
                          Try Again
                        </button>
                        <Link href="/" className="px-4 py-2 text-civiq-blue hover:underline">
                          ← Search Again
                        </Link>
                      </div>
                    </div>
                  )}

                  {data?.success && data.representatives && (
                    <>
                      {/* Change District Option */}
                      {selectedDistrict && multiDistrictData && (
                        <div className="mb-6 text-center">
                          <button
                            onClick={() => {
                              setSelectedDistrict(null);
                              setData(null);
                              setMultiDistrictData(multiDistrictData); // Restore multi-district selection
                            }}
                            className="text-sm text-civiq-blue hover:text-civiq-blue/80 transition-colors inline-flex items-center space-x-1"
                          >
                            <span>🔄</span>
                            <span>Change selected district</span>
                          </button>
                        </div>
                      )}

                      <div className="space-y-6">
                        {data.representatives.map((rep, index) => (
                          <Suspense
                            key={`${rep.name}-${index}`}
                            fallback={
                              <div className="bg-white border-2 border-black p-6 animate-pulse">
                                <div className="h-40 bg-gray-200 rounded"></div>
                              </div>
                            }
                          >
                            <RepresentativeCard representative={rep} />
                          </Suspense>
                        ))}
                      </div>

                      <div className="mt-8 text-center">
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                          <span>Data sourced from:</span>
                          <DataSourceBadge source={data.metadata?.dataSource} />
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              {activeTab === 'state' && (zipCode || query) && (
                <Suspense
                  fallback={
                    <div className="text-center py-8">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <p className="mt-4 text-gray-600">Loading state representatives...</p>
                    </div>
                  }
                >
                  <StateRepresentativesTab zipCode={zipCode || query || ''} />
                </Suspense>
              )}

              {activeTab === 'map' && (zipCode || query) && (
                <div className="space-y-4">
                  {/* Map Type Toggle */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">District Boundaries</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Map type:</span>
                      <button
                        onClick={() => setUseInteractiveMap(!useInteractiveMap)}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                          useInteractiveMap
                            ? 'bg-civiq-blue text-white'
                            : 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {useInteractiveMap ? 'Interactive' : 'Static'}
                      </button>
                    </div>
                  </div>

                  <InteractiveDistrictMap zipCode={zipCode || query || ''} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Show error state if no search query */}
        {!zipCode && !address && !query && (
          <div className="bg-red-50 border border-red-200 p-6 text-center">
            <p className="text-red-800 font-medium">Error</p>
            <p className="text-red-600 mt-1">No search query provided</p>
            <Link href="/" className="inline-block mt-4 text-civiq-blue hover:underline">
              ← Go to search page
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

export default function Results() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-civiq-blue"></div>
            <p className="mt-4 text-gray-600">Loading results...</p>
          </div>
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
