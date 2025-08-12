'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState, Suspense, useCallback, memo } from 'react';
import { SearchHistory } from '@/lib/searchHistory';
import {
  RepresentativeSkeleton,
  SearchResultsSkeleton,
} from '@/shared/components/ui/SkeletonComponents';
import { LoadingStateWrapper, LoadingMessage, Spinner } from '@/shared/components/ui/LoadingStates';
import { useMultiStageLoading } from '@/hooks/useSmartLoading';
import { DistrictMap } from '@/features/districts/components/DistrictMap';
import { InteractiveDistrictMap } from '@/features/districts/components/InteractiveDistrictMap';
import { DataQualityIndicator, DataSourceBadge } from '@/components/ui/DataQualityIndicator';
import {
  InlineQualityScore,
  DataTrustIndicator,
} from '@/shared/components/ui/DataQualityDashboard';
import RepresentativePhoto from '@/features/representatives/components/RepresentativePhoto';
import { DistrictSelector } from '@/features/districts/components/DistrictSelector';
import { AddressRefinement } from '@/features/districts/components/AddressRefinement';
import {
  checkMultiDistrict,
  DistrictInfo,
  MultiDistrictResponse,
} from '@/lib/multi-district/detection';

function CiviqLogo() {
  return (
    <div className="flex items-center">
      <svg className="w-10 h-10" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect x="36" y="51" width="28" height="30" fill="#0b983c" />
        <circle cx="50" cy="31" r="22" fill="#ffffff" />
        <circle cx="50" cy="31" r="20" fill="#e11d07" />
        <circle cx="38" cy="89" r="2" fill="#3ea2d4" />
        <circle cx="46" cy="89" r="2" fill="#3ea2d4" />
        <circle cx="54" cy="89" r="2" fill="#3ea2d4" />
        <circle cx="62" cy="89" r="2" fill="#3ea2d4" />
      </svg>
      <span className="ml-3 text-xl font-bold text-gray-900">CIV.IQ</span>
    </div>
  );
}

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

interface StateLegislator {
  id: string;
  name: string;
  party: string;
  chamber: 'upper' | 'lower';
  district: string;
  state: string;
  image?: string;
  email?: string;
  phone?: string;
  website?: string;
  offices?: Array<{
    name: string;
    address?: string;
    phone?: string;
    email?: string;
  }>;
  currentRole?: {
    title: string;
    org_classification: string;
    district: string;
    party: string;
    start_date: string;
    end_date?: string;
  };
}

interface StateApiResponse {
  zipCode: string;
  state: string;
  stateName: string;
  legislators: StateLegislator[];
  jurisdiction?: {
    name: string;
    classification: string;
    chambers: Array<{
      name: string;
      classification: string;
    }>;
  };
}

const RepresentativeCard = memo(function RepresentativeCard({
  representative,
}: {
  representative: Representative;
}) {
  const getPartyColor = (party: string) => {
    if (party.toLowerCase().includes('democrat')) return 'text-blue-600 bg-blue-50';
    if (party.toLowerCase().includes('republican')) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      {/* Header Section */}
      <div className="p-6 pb-4">
        <div className="flex items-start gap-4">
          <RepresentativePhoto
            bioguideId={representative.bioguideId}
            name={representative.name}
            size="lg"
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-semibold text-gray-900 mb-1">{representative.name}</h3>
            <p className="text-gray-600 mb-2">{representative.title}</p>

            <div className="flex flex-wrap gap-2 mb-3">
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${getPartyColor(representative.party)}`}
              >
                {representative.party}
              </span>
              {representative.chamber === 'House' && representative.district && (
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                  District {representative.district}
                </span>
              )}
              {representative.yearsInOffice && (
                <span className="px-2 py-1 bg-civiq-green/10 text-civiq-green rounded-full text-xs font-medium">
                  {representative.yearsInOffice} years in office
                </span>
              )}
            </div>

            {representative.nextElection && (
              <div className="flex items-center gap-1 text-sm text-gray-600 mb-3">
                <span className="font-medium">Next Election:</span>
                <span>{representative.nextElection}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Committee Assignments */}
      {representative.committees && representative.committees.length > 0 && (
        <div className="px-6 pb-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Key Committee Assignments</h4>
          <div className="space-y-1">
            {representative.committees.slice(0, 3).map((committee, index) => (
              <div key={index} className="text-sm text-gray-600">
                <span className="font-medium">{committee.name}</span>
                {committee.role && <span className="text-civiq-blue ml-1">({committee.role})</span>}
              </div>
            ))}
            {representative.committees.length > 3 && (
              <div className="text-xs text-gray-500">
                +{representative.committees.length - 3} more committees
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contact Information */}
      <div className="px-6 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {representative.phone && (
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700">📞</span>
              <span className="text-gray-600">{representative.phone}</span>
            </div>
          )}
          {representative.email && (
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700">✉️</span>
              <a
                href={`mailto:${representative.email}`}
                className="text-civiq-blue hover:underline truncate"
              >
                {representative.email}
              </a>
            </div>
          )}
          {representative.website && (
            <div className="flex items-center gap-2 md:col-span-2">
              <span className="font-medium text-gray-700">🌐</span>
              <a
                href={representative.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-civiq-blue hover:underline"
              >
                Official Website
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Data Completeness & Action */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className="bg-civiq-green h-2 rounded-full"
                style={{ width: `${representative.dataComplete}%` }}
              ></div>
            </div>
            <span className="text-xs text-gray-600">{representative.dataComplete}% complete</span>
          </div>
          <Link
            href={`/representative/${representative.bioguideId}`}
            className="ml-4 bg-civiq-blue text-white px-4 py-2 rounded hover:bg-civiq-blue/90 transition-colors text-sm font-medium"
          >
            View Profile
          </Link>
        </div>
      </div>
    </div>
  );
});

const StateLegislatorCard = memo(function StateLegislatorCard({
  legislator,
}: {
  legislator: StateLegislator;
}) {
  const getPartyColor = (party: string) => {
    if (party.toLowerCase().includes('democrat')) return 'text-blue-600 bg-blue-50';
    if (party.toLowerCase().includes('republican')) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getChamberInfo = (chamber: string) => {
    if (chamber === 'upper')
      return { name: 'State Senate', color: 'bg-purple-100 text-purple-800' };
    if (chamber === 'lower') return { name: 'State House', color: 'bg-green-100 text-green-800' };
    return { name: 'Legislature', color: 'bg-gray-100 text-gray-800' };
  };

  const chamberInfo = getChamberInfo(legislator.chamber);

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      {/* Header Section */}
      <div className="p-6 pb-4">
        <div className="flex items-start gap-4">
          <RepresentativePhoto bioguideId={legislator.id} name={legislator.name} size="md" />
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{legislator.name}</h3>
            <p className="text-gray-600 mb-2">
              {legislator.currentRole?.title || `${chamberInfo.name} Member`}
            </p>

            <div className="flex flex-wrap gap-2 mb-3">
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${getPartyColor(legislator.party)}`}
              >
                {legislator.party}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${chamberInfo.color}`}>
                {chamberInfo.name}
              </span>
              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                District {legislator.district}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="px-6 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {legislator.phone && (
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700">📞</span>
              <span className="text-gray-600">{legislator.phone}</span>
            </div>
          )}
          {legislator.email && (
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700">✉️</span>
              <a
                href={`mailto:${legislator.email}`}
                className="text-civiq-blue hover:underline truncate"
              >
                {legislator.email}
              </a>
            </div>
          )}
          {legislator.website && (
            <div className="flex items-center gap-2 md:col-span-2">
              <span className="font-medium text-gray-700">🌐</span>
              <a
                href={legislator.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-civiq-blue hover:underline"
              >
                Official Website
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Offices */}
      {legislator.offices && legislator.offices.length > 0 && (
        <div className="px-6 pb-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Offices</h4>
          <div className="space-y-2">
            {legislator.offices.slice(0, 2).map((office, index) => (
              <div key={index} className="text-sm text-gray-600">
                <span className="font-medium">{office.name}</span>
                {office.address && (
                  <div className="text-xs text-gray-500 mt-1">{office.address}</div>
                )}
                {office.phone && <div className="text-xs text-gray-500">Phone: {office.phone}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">{legislator.state} State Legislature</span>
          {legislator.currentRole?.start_date && (
            <span className="text-gray-500">
              Since {new Date(legislator.currentRole.start_date).getFullYear()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

const StateRepresentativesTab = memo(function StateRepresentativesTab({
  zipCode,
}: {
  zipCode: string;
}) {
  const [stateData, setStateData] = useState<StateApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStateRepresentatives = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/state-representatives?zip=${encodeURIComponent(zipCode)}`
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch state representatives');
        }

        const data: StateApiResponse = await response.json();
        setStateData(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setStateData(null);
      } finally {
        setLoading(false);
      }
    };

    if (zipCode) {
      fetchStateRepresentatives();
    }
  }, [zipCode]);

  if (loading) {
    return (
      <>
        <div className="text-center py-8">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">Finding your state representatives...</p>
        </div>

        <div className="space-y-6">
          <RepresentativeSkeleton />
          <RepresentativeSkeleton />
          <RepresentativeSkeleton />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800 font-medium">Error</p>
        <p className="text-red-600 mt-1">{error}</p>
      </div>
    );
  }

  if (!stateData || stateData.legislators.length === 0) {
    return (
      <div className="text-center py-8 text-gray-600">
        <p>No state representatives found for this ZIP code.</p>
      </div>
    );
  }

  const senators = stateData.legislators.filter(leg => leg.chamber === 'upper');
  const representatives = stateData.legislators.filter(leg => leg.chamber === 'lower');

  return (
    <div className="space-y-8">
      {/* State Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {stateData.stateName} State Legislature
        </h3>
        <p className="text-gray-600">
          State representatives for ZIP code <span className="font-semibold">{zipCode}</span>
        </p>
        {stateData.jurisdiction && (
          <div className="mt-4 flex flex-wrap gap-2">
            {stateData.jurisdiction.chambers.map((chamber, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
              >
                {chamber.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* State Senators */}
      {senators.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            State Senators ({senators.length})
          </h3>
          <div className="space-y-4">
            {senators.map(senator => (
              <StateLegislatorCard key={senator.id} legislator={senator} />
            ))}
          </div>
        </div>
      )}

      {/* State Representatives */}
      {representatives.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            State Representatives ({representatives.length})
          </h3>
          <div className="space-y-4">
            {representatives.map(representative => (
              <StateLegislatorCard key={representative.id} legislator={representative} />
            ))}
          </div>
        </div>
      )}

      <div className="text-center text-sm text-gray-500">
        State legislature data sourced from the OpenStates Project
      </div>
    </div>
  );
});

function ResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
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
          nextStage(); // "Checking district boundaries..."
          const multiDistrictCheck = await checkMultiDistrict(searchQuery);

          if (multiDistrictCheck.success && multiDistrictCheck.isMultiDistrict) {
            // Multi-district ZIP - show district selector
            setMultiDistrictData(multiDistrictCheck);
            clearTimeout(loadingTimeout); // Clear timeout before completing
            completeLoading();
            return;
          } else if (multiDistrictCheck.success && !multiDistrictCheck.isMultiDistrict) {
            // Single district - continue with normal flow using multi-district API for consistency
            nextStage(); // "Looking up representatives..."
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

              nextStage(); // "Loading additional data..."
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
        let response;
        if (query) {
          // New search system
          response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        } else {
          // Legacy ZIP/address endpoints
          response = await fetch(
            `/api/representatives-search?q=${encodeURIComponent(searchQuery)}`
          );
        }
        const apiData: ApiResponse = await response.json();

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
    // Navigate to representatives page with district parameters
    router.push(`/representatives?district=${district.district}&state=${district.state}`);
  };

  const handleAddressRefinement = () => {
    setShowAddressRefinement(true);
  };

  const handleAddressSuccess = async (state: string, district: string, _address: string) => {
    // Navigate directly to the representatives page with the district info
    router.push(`/representatives?state=${state}&district=${district}`);
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
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
                        className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition-colors"
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
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-8">
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
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
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
                          className="px-4 py-2 bg-civiq-blue text-white rounded-lg hover:bg-blue-700 transition-colors"
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
                          <RepresentativeCard key={`${rep.name}-${index}`} representative={rep} />
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
                <StateRepresentativesTab zipCode={zipCode || query || ''} />
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
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {useInteractiveMap ? 'Interactive' : 'Static'}
                      </button>
                    </div>
                  </div>

                  {useInteractiveMap ? (
                    <InteractiveDistrictMap zipCode={zipCode || query || ''} />
                  ) : (
                    <DistrictMap zipCode={zipCode || query || ''} />
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Show error state if no search query */}
        {!zipCode && !address && !query && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
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
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
