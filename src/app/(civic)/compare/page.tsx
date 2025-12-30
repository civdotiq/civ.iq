'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { SiteHeader } from '@/components/shared/layout/SiteHeader';

// Breadcrumb Navigation Component
function BreadcrumbNav() {
  return (
    <nav className="text-sm text-gray-500 mb-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
      <Link href="/" className="hover:text-blue-600">
        Home
      </Link>
      <span className="mx-2">›</span>
      <Link href="/representatives" className="hover:text-blue-600">
        Representatives
      </Link>
      <span className="mx-2">›</span>
      <span className="font-medium text-gray-900">Compare</span>
    </nav>
  );
}

// Lazy load comparison components for better performance
const ComparisonHeader = dynamic(
  () => import('@/features/comparison/components/ComparisonHeader'),
  {
    ssr: false,
    loading: () => <div className="bg-white border-b border-gray-200 h-20 animate-pulse" />,
  }
);

const RepresentativeSelector = dynamic(
  () => import('@/features/comparison/components/RepresentativeSelector'),
  {
    ssr: false,
    loading: () => <div className="bg-white rounded-lg shadow-lg p-6 animate-pulse h-96" />,
  }
);

const ComparisonChart = dynamic(() => import('@/features/comparison/components/ComparisonChart'), {
  ssr: false,
  loading: () => <div className="bg-white rounded-lg shadow-lg p-6 animate-pulse h-64" />,
});

// Types
interface Representative {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district?: string;
  chamber: 'House' | 'Senate';
  title: string;
  yearsInOffice: number;
  imageUrl?: string;
  committees: Array<{
    name: string;
    role?: string;
  }>;
  votingRecord: {
    totalVotes: number;
    partyLineVotes: number;
    missedVotes: number;
  };
  billsSponsored: number;
  billsCosponsored: number;
}

export default function ComparePage() {
  const searchParams = useSearchParams();
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [chartType, setChartType] = useState<'voting' | 'committees' | 'bills' | 'overview'>(
    'overview'
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load representatives data
  useEffect(() => {
    async function loadRepresentatives() {
      try {
        setLoading(true);
        const response = await fetch('/api/representatives');
        if (!response.ok) {
          throw new Error('Failed to fetch representatives');
        }
        const data = await response.json();

        // Transform data to match our interface
        const transformedReps: Representative[] = data.map((rep: Record<string, unknown>) => ({
          bioguideId: (rep.bioguideId as string) || '',
          name: (rep.name as string) || '',
          party: (rep.party as string) || '',
          state: (rep.state as string) || '',
          district: rep.district as string | undefined,
          chamber: (rep.chamber as 'House' | 'Senate') || 'House',
          title:
            (rep.title as string) || `${rep.chamber === 'House' ? 'Rep.' : 'Sen.'} ${rep.name}`,
          yearsInOffice: (rep.yearsInOffice as number) || 0,
          imageUrl: rep.imageUrl as string | undefined,
          committees: (rep.committees as Array<{ name: string; role?: string }>) || [],
          votingRecord: {
            totalVotes: ((rep.votingRecord as Record<string, unknown>)?.totalVotes as number) || 0,
            partyLineVotes:
              ((rep.votingRecord as Record<string, unknown>)?.partyLineVotes as number) || 0,
            missedVotes:
              ((rep.votingRecord as Record<string, unknown>)?.missedVotes as number) || 0,
          },
          billsSponsored: (rep.billsSponsored as number) || 0,
          billsCosponsored: (rep.billsCosponsored as number) || 0,
        }));

        setRepresentatives(transformedReps);

        // Check for pre-selected representatives from URL
        const preselected = searchParams.get('reps');
        if (preselected) {
          const ids = preselected.split(',').slice(0, 4); // Max 4
          setSelectedIds(ids);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    loadRepresentatives();
  }, [searchParams]);

  const selectedRepresentatives = representatives.filter(rep =>
    selectedIds.includes(rep.bioguideId)
  );

  const handleSelectionChange = (newSelectedIds: string[]) => {
    setSelectedIds(newSelectedIds);
    // Update URL with selected representatives
    if (newSelectedIds.length > 0) {
      const params = new URLSearchParams();
      params.set('reps', newSelectedIds.join(','));
      window.history.replaceState(null, '', `?${params.toString()}`);
    } else {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  const handleClear = () => {
    setSelectedIds([]);
    window.history.replaceState(null, '', window.location.pathname);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 h-20 animate-pulse" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg shadow-lg p-6 animate-pulse h-96" />
            <div className="bg-white rounded-lg shadow-lg p-6 animate-pulse h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-red-500 mb-4">
            <svg
              className="mx-auto h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Data</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 density-compact">
      <SiteHeader />
      <BreadcrumbNav />
      <ComparisonHeader
        selectedReps={selectedRepresentatives.map(rep => ({
          bioguideId: rep.bioguideId,
          name: rep.name,
        }))}
        onClear={handleClear}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Representative Selector */}
          <div>
            <RepresentativeSelector
              representatives={representatives}
              selectedIds={selectedIds}
              onSelectionChange={handleSelectionChange}
              maxSelections={4}
            />
          </div>

          {/* Comparison Chart */}
          <div>
            {selectedIds.length > 0 && (
              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {['overview', 'voting', 'committees', 'bills'].map(type => (
                    <button
                      key={type}
                      onClick={() =>
                        setChartType(type as 'voting' | 'committees' | 'bills' | 'overview')
                      }
                      className={`
                        px-3 py-2 text-sm font-medium rounded-md transition-colors capitalize
                        ${
                          chartType === type
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }
                      `}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <ComparisonChart representatives={selectedRepresentatives} chartType={chartType} />
          </div>
        </div>

        {/* Help Text */}
        {selectedIds.length === 0 && (
          <div className="mt-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Compare Representatives</h2>
            <p className="text-lg text-gray-600 mb-6">
              Select up to 4 representatives to compare their voting records, committee memberships,
              and legislative achievements side by side.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-8 h-8 text-blue-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Select Representatives</h3>
                <p className="text-sm text-gray-600">
                  Choose from all current House and Senate members
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-8 h-8 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">View Comparisons</h3>
                <p className="text-sm text-gray-600">
                  Interactive charts showing key metrics and achievements
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-8 h-8 text-civiq-blue"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Analyze Performance</h3>
                <p className="text-sm text-gray-600">
                  Real data from Congress.gov and government sources
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
