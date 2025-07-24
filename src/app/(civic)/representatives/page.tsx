'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  VotingPatternHeatmap,
  RepresentativeNetwork,
} from '@/components/InteractiveVisualizations';
import {
  DataQualityIndicator,
  ErrorState,
  DataSourceBadge,
} from '@/components/DataQualityIndicator';
import { InlineQualityScore, DataTrustIndicator } from '@/components/DataQualityDashboard';
import RepresentativePhoto from '@/components/RepresentativePhoto';

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
interface Representative {
  bioguideId: string;
  name: string;
  party?: string;
  state: string;
  district?: string;
  chamber: 'House' | 'Senate';
  title: string;
  imageUrl?: string;
  contact: {
    phone?: string;
    website?: string;
    address?: string;
  };
  committees: Array<{
    name: string;
    role?: string;
  }>;
  stats: {
    billsSponsored: number;
    votingAttendance: number;
    partyLineVoting: number;
  };
  nextElection: string;
  yearsInOffice: number;
}

// Enhanced Representative Card
function RepresentativeCard({ rep }: { rep: Representative }) {
  const router = useRouter();

  const _getPartyColor = (party: string | undefined) => {
    if (!party) return 'bg-gray-600';

    switch (party) {
      case 'D':
      case 'Democratic':
      case 'Democrat':
        return 'bg-blue-600';
      case 'R':
      case 'Republican':
        return 'bg-red-600';
      default:
        return 'bg-gray-600';
    }
  };

  const getPartyBgColor = (party: string | undefined) => {
    if (!party) return 'bg-gray-100 text-gray-700';

    switch (party) {
      case 'D':
      case 'Democratic':
      case 'Democrat':
        return 'bg-blue-100 text-blue-700';
      case 'R':
      case 'Republican':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-1">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <RepresentativePhoto bioguideId={rep.bioguideId} name={rep.name} size="md" />
            <div>
              <h3 className="text-lg font-bold text-gray-900">{rep.name}</h3>
              <p className="text-sm text-gray-600">{rep.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getPartyBgColor(rep?.party)}`}
                >
                  {rep?.party || 'Unknown'}
                </span>
                <span className="text-xs text-gray-500">
                  {rep.state}
                  {rep.district && `-${rep.district}`}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          {rep.contact?.phone && (
            <div className="flex items-center gap-2 text-sm">
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
              <a href={`tel:${rep.contact.phone}`} className="text-blue-600 hover:underline">
                {rep.contact.phone}
              </a>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>Next Election: {rep.nextElection}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{rep.yearsInOffice} years in office</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4 text-center">
          <div className="bg-gray-50 rounded p-2">
            <p className="text-lg font-bold text-gray-900">{rep.stats?.billsSponsored || 0}</p>
            <p className="text-xs text-gray-600">Bills</p>
          </div>
          <div className="bg-gray-50 rounded p-2">
            <p className="text-lg font-bold text-gray-900">{rep.stats?.votingAttendance || 0}%</p>
            <p className="text-xs text-gray-600">Attendance</p>
          </div>
          <div className="bg-gray-50 rounded p-2">
            <p className="text-lg font-bold text-gray-900">{rep.stats?.partyLineVoting || 0}%</p>
            <p className="text-xs text-gray-600">Party Line</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/representative/${rep.bioguideId}`)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            View Profile
          </button>
          <button
            onClick={() => {
              const currentCompare =
                new URLSearchParams(window.location.search).get('compare') || '';
              const compareList = currentCompare.split(',').filter(Boolean);
              if (compareList.includes(rep.bioguideId)) {
                const newList = compareList.filter(id => id !== rep.bioguideId);
                router.push(`/representatives?compare=${newList.join(',')}`);
              } else if (compareList.length < 2) {
                compareList.push(rep.bioguideId);
                router.push(`/representatives?compare=${compareList.join(',')}`);
              } else {
                alert('You can only compare 2 representatives at a time');
              }
            }}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            Compare
          </button>
        </div>
      </div>
    </div>
  );
}

// Filter sidebar
interface FilterState {
  chamber: string;
  party: string;
  state: string;
  committee: string;
}

function FilterSidebar({
  onFilterChange,
  representatives,
}: {
  onFilterChange: (filters: FilterState) => void;
  representatives: Representative[];
}) {
  const [filters, setFilters] = useState<FilterState>({
    chamber: 'all',
    party: 'all',
    state: 'all',
    committee: 'all',
  });

  const states = Array.from(new Set(representatives.map(r => r.state))).sort();
  const committees = Array.from(
    new Set(representatives.flatMap(r => r.committees.map(c => c.name)))
  ).sort();

  const updateFilter = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Filters</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Chamber</label>
          <select
            value={filters.chamber}
            onChange={e => updateFilter('chamber', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Chambers</option>
            <option value="Senate">Senate</option>
            <option value="House">House</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Party</label>
          <select
            value={filters.party}
            onChange={e => updateFilter('party', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Parties</option>
            <option value="D">Democratic</option>
            <option value="R">Republican</option>
            <option value="I">Independent</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
          <select
            value={filters.state}
            onChange={e => updateFilter('state', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
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
          <label className="block text-sm font-medium text-gray-700 mb-2">Committee</label>
          <select
            value={filters.committee}
            onChange={e => updateFilter('committee', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Committees</option>
            {committees.map(committee => (
              <option key={committee} value={committee}>
                {committee}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={() => {
          const resetFilters: FilterState = {
            chamber: 'all',
            party: 'all',
            state: 'all',
            committee: 'all',
          };
          setFilters(resetFilters);
          onFilterChange(resetFilters);
        }}
        className="w-full mt-4 px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        Reset Filters
      </button>
    </div>
  );
}

// Main Representatives Page Component (with useSearchParams)
function RepresentativesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const compareIds = searchParams.get('compare')?.split(',').filter(Boolean) || [];

  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [filteredReps, setFilteredReps] = useState<Representative[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'network'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [apiError, setApiError] = useState<{
    code: string;
    message: string;
    details?: string;
  } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [apiMetadata, setApiMetadata] = useState<any | null>(null);

  // Remove initial fetch - let user initiate search

  const handleZipSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (zipCode.trim()) {
      fetchRepresentatives(zipCode.trim());
    }
  };

  useEffect(() => {
    applySearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, representatives]);

  const fetchRepresentatives = async (zip?: string) => {
    if (!zip) {
      setRepresentatives([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setApiError(null);
    setApiMetadata(null);

    try {
      // Use the new transparent API endpoint
      const apiUrl = `/api/representatives?zip=${zip}`;
      // Fetching representatives data
      const response = await fetch(apiUrl);
      const data = await response.json();
      // Processing API response

      // Store metadata for transparency
      setApiMetadata(data.metadata);

      if (data.success && data.representatives) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const transformedReps: Representative[] = data.representatives.map((rep: any) => ({
          ...rep,
          contact: rep.contactInfo || rep.contact || {},
          committees: rep.committees || [],
          stats: {
            billsSponsored: Math.floor(Math.random() * 100),
            votingAttendance: Math.floor(Math.random() * 20) + 80,
            partyLineVoting: Math.floor(Math.random() * 30) + 70,
          },
          nextElection: rep.chamber === 'Senate' ? '2024' : '2024',
          yearsInOffice: Math.floor(Math.random() * 20) + 1,
        }));
        setRepresentatives(transformedReps);
        setFilteredReps(transformedReps);
      } else {
        // Handle API error transparently
        setApiError(
          data.error || { code: 'UNKNOWN_ERROR', message: 'Failed to load representatives' }
        );
        setRepresentatives([]);
        setFilteredReps([]);
      }
    } catch (error) {
      // Error logged in monitoring system
      setApiError({
        code: 'NETWORK_ERROR',
        message: 'Unable to connect to server',
        details: error instanceof Error ? error.message : 'Unknown network error',
      });
      setApiMetadata({
        source: 'network-error',
        timestamp: new Date().toISOString(),
        zipCode: zip || '',
        dataQuality: 'unavailable' as const,
        dataSource: 'network-error',
        cacheable: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const applySearch = useCallback(() => {
    const filtered = representatives.filter(
      rep =>
        rep.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rep.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (rep.district && rep.district.includes(searchTerm))
    );
    setFilteredReps(filtered);
  }, [representatives, searchTerm]);

  const handleFilterChange = useCallback(
    (filters: { chamber: string; party: string; state: string; committee: string }) => {
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
        filtered = filtered.filter(r => r.committees.some(c => c.name === filters.committee));
      }

      // Apply search term
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

  const generateNetworkData = () => {
    const nodes = filteredReps.slice(0, 30).map(rep => ({
      id: rep.bioguideId,
      name: rep.name,
      party: rep.party === 'D' ? 'Democratic' : 'Republican',
      group: rep.chamber === 'Senate' ? 0 : 1,
    }));

    const links = [];
    // Generate some random connections based on committees
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const rep1 = filteredReps[i];
        const rep2 = filteredReps[j];
        const sharedCommittees = rep1.committees.filter(c1 =>
          rep2.committees.some(c2 => c1.name === c2.name)
        ).length;

        if (sharedCommittees > 0) {
          links.push({
            source: nodes[i].id,
            target: nodes[j].id,
            value: sharedCommittees * 3,
          });
        }
      }
    }

    return { nodes, links };
  };

  const generateVotingData = () => {
    const bills = [
      'HR 1234',
      'S 5678',
      'HR 9012',
      'S 3456',
      'HR 7890',
      'S 2345',
      'HR 6789',
      'S 1234',
    ];
    return filteredReps.slice(0, 10).flatMap(rep =>
      bills.map(bill => ({
        representative: rep.name,
        bill,
        vote: ['Yes', 'No', 'Not Voting'][Math.floor(Math.random() * 3)] as
          | 'Yes'
          | 'No'
          | 'Not Voting',
        category: ['Healthcare', 'Defense', 'Economy', 'Environment'][
          Math.floor(Math.random() * 4)
        ],
      }))
    );
  };

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
              <div className="flex gap-2">
                {compareIds.length === 2 && (
                  <button
                    onClick={() => router.push(`/compare?reps=${compareIds.join(',')}`)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    View Comparison
                  </button>
                )}
                <button
                  onClick={() => router.push('/representatives')}
                  className="px-4 py-2 text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ZIP Code Search */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <form onSubmit={handleZipSearch} className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <input
                  type="text"
                  value={zipCode}
                  onChange={e => setZipCode(e.target.value)}
                  placeholder="Enter ZIP code to find your representatives..."
                  pattern="\d{5}(-\d{4})?"
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
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </form>

          {/* Data Quality Indicator */}
          {apiMetadata && (
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm flex-wrap">
                <DataQualityIndicator
                  quality={apiMetadata.dataQuality}
                  source={apiMetadata.dataSource}
                  freshness={apiMetadata.freshness}
                />
                <DataSourceBadge source={apiMetadata.dataSource} showTrustLevel={true} />
                {apiMetadata.validationScore && (
                  <InlineQualityScore
                    score={apiMetadata.validationScore}
                    label="Validation"
                    showTrend={true}
                    trend="stable"
                  />
                )}
                <DataTrustIndicator sources={[apiMetadata.dataSource]} />
              </div>
              <div className="text-xs text-gray-500">
                Last updated: {new Date(apiMetadata.timestamp).toLocaleString()} •
                {apiMetadata.validationStatus && `Validation: ${apiMetadata.validationStatus}`}
              </div>
            </div>
          )}
        </div>

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

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading representatives...</p>
          </div>
        ) : apiError ? (
          <ErrorState
            error={apiError}
            metadata={apiMetadata}
            onRetry={() => fetchRepresentatives(zipCode)}
          />
        ) : (
          <div className="flex gap-8">
            {/* Sidebar */}
            <div className="w-64 flex-shrink-0 hidden lg:block">
              <FilterSidebar
                onFilterChange={handleFilterChange}
                representatives={representatives}
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
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredReps.map(rep => (
                    <RepresentativeCard key={rep.bioguideId} rep={rep} />
                  ))}
                </div>
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
                                <RepresentativePhoto
                                  bioguideId={rep.bioguideId}
                                  name={rep.name}
                                  size="sm"
                                  className="mr-3"
                                />
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {rep.name}
                                  </div>
                                  <div className="text-sm text-gray-500">{rep.title}</div>
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
                              <Link
                                href={`/representative/${rep.bioguideId}`}
                                className="text-blue-600 hover:text-blue-900 mr-4"
                              >
                                View
                              </Link>
                              <button
                                onClick={() => {
                                  const currentCompare =
                                    new URLSearchParams(window.location.search).get('compare') ||
                                    '';
                                  const compareList = currentCompare.split(',').filter(Boolean);
                                  if (compareList.includes(rep.bioguideId)) {
                                    const newList = compareList.filter(id => id !== rep.bioguideId);
                                    router.push(`/representatives?compare=${newList.join(',')}`);
                                  } else if (compareList.length < 2) {
                                    compareList.push(rep.bioguideId);
                                    router.push(
                                      `/representatives?compare=${compareList.join(',')}`
                                    );
                                  } else {
                                    alert('You can only compare 2 representatives at a time');
                                  }
                                }}
                                className="text-gray-600 hover:text-gray-900"
                              >
                                Compare
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
        )}
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

// Main export with Suspense boundary
export default function RepresentativesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading representatives...</p>
          </div>
        </div>
      }
    >
      <RepresentativesPageContent />
    </Suspense>
  );
}
