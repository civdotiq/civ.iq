'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useState, Suspense, ComponentType } from 'react';
import { LoadingErrorBoundary } from '@/components/ErrorBoundary';
import dynamic from 'next/dynamic';

// Dynamic imports for lazy loading - optimized for performance
const LazyBillsTracker = dynamic(
  () =>
    import('@/features/legislation/components/BillsTracker').then(mod => ({
      default: mod.BillsTracker,
    })),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-gray-200 h-32 rounded"></div>,
  }
);

const LazyEnhancedVotingChart = dynamic(
  () =>
    import('@/components/EnhancedVotingChart').then(mod => ({ default: mod.EnhancedVotingChart })),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-gray-200 h-24 rounded"></div>,
  }
);

const LazyPartyAlignmentAnalysis = dynamic(() => import('@/components/PartyAlignmentAnalysis'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 h-40 rounded"></div>,
});

const LazyVotingRecordsTable = dynamic(
  () =>
    import('@/components/safe/SafeVotingRecordsTable')
      .then(mod => ({
        default: mod.SafeVotingRecordsTable,
      }))
      .catch(() => ({
        default: ({ bioguideId, chamber }: { bioguideId: string; chamber: 'House' | 'Senate' }) => (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-600 mb-4">Voting records are temporarily unavailable.</p>
            <p className="text-sm text-gray-500">
              We&apos;re working to display voting data for {chamber} representative {bioguideId}.
            </p>
          </div>
        ),
      })),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-gray-200 h-32 rounded"></div>,
  }
);

const LazyCampaignFinanceVisualizer = dynamic(
  () =>
    import('@/components/CampaignFinanceVisualizer').then(mod => ({
      default: mod.CampaignFinanceVisualizer,
    })),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-gray-200 h-32 rounded"></div>,
  }
);

const LazyEnhancedNewsFeed = dynamic(
  () =>
    import('@/features/news/components/EnhancedNewsFeed').then(mod => ({
      default: mod.EnhancedNewsFeed,
    })),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-gray-200 h-32 rounded"></div>,
  }
);

// Dynamic import for enhanced profile tab
const EnhancedProfileTab = dynamic(
  () =>
    import('@/features/representatives/components/ProfileTab/EnhancedProfileTab').then(mod => ({
      default: mod.EnhancedProfileTab,
    })),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded"></div>,
  }
);

interface RepresentativeDetails {
  bioguideId: string;
  name: string;
  firstName: string;
  lastName: string;
  party: string;
  state: string;
  district?: string;
  chamber: 'House' | 'Senate';
  title: string;
  terms: Array<{
    congress: string;
    startYear: string;
    endYear: string;
  }>;
  currentTerm?: {
    start: string;
    end: string;
    office?: string;
    phone?: string;
    address?: string;
    website?: string;
    contactForm?: string;
    rssUrl?: string;
    stateRank?: 'junior' | 'senior';
    class?: number;
  };
  socialMedia?: {
    twitter?: string;
    facebook?: string;
    youtube?: string;
    instagram?: string;
    mastodon?: string;
  };
  committees?: Array<{
    name: string;
    role?: string;
    thomas_id?: string;
    id?: string;
  }>;
}

interface RepresentativeProfileClientProps {
  representative: RepresentativeDetails;
  initialData: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    votes: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bills: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    finance: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    news: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    partyAlignment: any;
  };
  partialErrors: Record<string, string>;
  bioguideId: string;
  // Lazy-loaded components passed as props to prevent unnecessary bundling
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  VotingRecordsTable?: ComponentType<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  CampaignFinanceVisualizer?: ComponentType<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  EnhancedNewsFeed?: ComponentType<any>;
}

// Partial error display component
function PartialErrorDisplay({ partialErrors }: { partialErrors: Record<string, string> }) {
  const errorCount = Object.keys(partialErrors).length;

  if (errorCount === 0) return null;

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <div className="flex items-center">
        <svg
          className="w-5 h-5 text-yellow-600 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
        <h3 className="text-sm font-medium text-yellow-800">
          Some data could not be loaded ({errorCount} {errorCount === 1 ? 'section' : 'sections'})
        </h3>
      </div>

      {process.env.NODE_ENV === 'development' && (
        <details className="mt-2">
          <summary className="cursor-pointer text-sm text-yellow-700">View Details</summary>
          <ul className="mt-2 text-sm text-yellow-700 space-y-1">
            {Object.entries(partialErrors).map(([endpoint, error]) => (
              <li key={endpoint} className="flex">
                <span className="font-medium capitalize mr-2">{endpoint}:</span>
                <span className="text-yellow-600">{error}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

// Client component for interactive tab functionality
export function RepresentativeProfileClient({
  representative,
  initialData,
  partialErrors,
  bioguideId,
  VotingRecordsTable = LazyVotingRecordsTable,
  CampaignFinanceVisualizer = LazyCampaignFinanceVisualizer,
  EnhancedNewsFeed = LazyEnhancedNewsFeed,
}: RepresentativeProfileClientProps) {
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <>
      {/* Show partial errors if any */}
      <PartialErrorDisplay partialErrors={partialErrors} />

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'profile', label: 'Profile', disabled: false },
              { id: 'voting', label: 'Voting Record', disabled: initialData.votes.length === 0 },
              { id: 'bills', label: 'Legislation', disabled: initialData.bills.length === 0 },
              {
                id: 'finance',
                label: 'Campaign Finance',
                disabled: Object.keys(initialData.finance || {}).length === 0,
              },
              { id: 'news', label: 'News', disabled: initialData.news.length === 0 },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                disabled={tab.disabled}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : tab.disabled
                      ? 'border-transparent text-gray-400 cursor-not-allowed'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {tab.disabled && partialErrors[tab.id] && (
                  <span className="ml-1 text-xs text-red-500">⚠</span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content with Suspense boundaries for optimal loading */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        {activeTab === 'profile' && (
          <LoadingErrorBoundary>
            <Suspense
              fallback={
                <div className="animate-pulse space-y-4">
                  <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-64 bg-gray-200 rounded"></div>
                  <div className="h-32 bg-gray-200 rounded"></div>
                </div>
              }
            >
              <EnhancedProfileTab
                representative={representative}
                committees={representative.committees}
              />
            </Suspense>
          </LoadingErrorBoundary>
        )}

        {activeTab === 'voting' && (
          <LoadingErrorBoundary>
            {partialErrors.votes ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Voting data could not be loaded</p>
                <p className="text-sm text-gray-400 mt-1">{partialErrors.votes}</p>
              </div>
            ) : initialData.votes.length > 0 ? (
              <div className="space-y-6">
                {/* Voting Records Header with Timestamp */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Voting Records</h3>
                  <span className="text-xs text-gray-500">
                    Last updated: {new Date().toLocaleDateString()}
                  </span>
                </div>

                {/* Party Alignment Analysis - Moved from Profile section */}
                {Object.keys(initialData.partyAlignment || {}).length > 0 &&
                  representative.party && (
                    <LazyPartyAlignmentAnalysis
                      bioguideId={bioguideId}
                      representative={{
                        name: representative.name || 'Representative',
                        party: representative.party,
                        state: representative.state || 'Unknown',
                        chamber: representative.chamber || 'Unknown',
                      }}
                    />
                  )}

                {/* Pre-rendered voting chart with server data */}
                <LazyEnhancedVotingChart
                  votes={initialData.votes}
                  party={representative.party || 'Unknown'}
                />

                {/* Lazy-loaded interactive voting table with Suspense */}
                <Suspense
                  fallback={
                    <div className="animate-pulse space-y-3">
                      <div className="h-12 bg-gray-200 rounded"></div>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-16 bg-gray-100 rounded"></div>
                      ))}
                    </div>
                  }
                >
                  <VotingRecordsTable bioguideId={bioguideId} chamber={representative.chamber} />
                </Suspense>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No voting data available</p>
              </div>
            )}
          </LoadingErrorBoundary>
        )}

        {activeTab === 'bills' && (
          <LoadingErrorBoundary>
            {partialErrors.bills ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Bills data could not be loaded</p>
                <p className="text-sm text-gray-400 mt-1">{partialErrors.bills}</p>
              </div>
            ) : initialData.bills.length > 0 ? (
              <div className="space-y-6">
                {/* Bills Header with Timestamp */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Sponsored Legislation</h3>
                  <span className="text-xs text-gray-500">
                    Last updated: {new Date().toLocaleDateString()}
                  </span>
                </div>

                {/* Pre-rendered bills tracker with server data - no additional loading needed */}
                <LazyBillsTracker bills={initialData.bills} representative={representative} />
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No bills data available</p>
              </div>
            )}
          </LoadingErrorBoundary>
        )}

        {activeTab === 'finance' && (
          <LoadingErrorBoundary>
            {partialErrors.finance ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Finance data could not be loaded</p>
                <p className="text-sm text-gray-400 mt-1">{partialErrors.finance}</p>
              </div>
            ) : Object.keys(initialData.finance || {}).length > 0 ? (
              <div className="space-y-6">
                {/* Campaign Finance Header with Timestamp */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Campaign Finance</h3>
                  <span className="text-xs text-gray-500">
                    Last updated: {new Date().toLocaleDateString()}
                  </span>
                </div>

                {/* Lazy-loaded heavy chart component with Suspense */}
                <Suspense
                  fallback={
                    <div className="animate-pulse">
                      <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                      <div className="h-64 bg-gray-200 rounded mb-4"></div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="h-32 bg-gray-100 rounded"></div>
                        <div className="h-32 bg-gray-100 rounded"></div>
                        <div className="h-32 bg-gray-100 rounded"></div>
                      </div>
                    </div>
                  }
                >
                  <CampaignFinanceVisualizer
                    financeData={initialData.finance}
                    representative={representative}
                    bioguideId={bioguideId}
                  />
                </Suspense>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No finance data available</p>
              </div>
            )}
          </LoadingErrorBoundary>
        )}

        {activeTab === 'news' && (
          <LoadingErrorBoundary>
            {partialErrors.news ? (
              <div className="text-center py-8">
                <p className="text-gray-500">News data could not be loaded</p>
                <p className="text-sm text-gray-400 mt-1">{partialErrors.news}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* News Header with Timestamp */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Recent News</h3>
                  <span className="text-xs text-gray-500">
                    Last updated: {new Date().toLocaleDateString()}
                  </span>
                </div>

                {/* Lazy-loaded news feed with auto-refresh capability and Suspense */}
                <Suspense
                  fallback={
                    <div className="animate-pulse space-y-4">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="border rounded-lg p-4">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-gray-100 rounded w-1/2 mb-2"></div>
                          <div className="h-3 bg-gray-100 rounded w-1/4"></div>
                        </div>
                      ))}
                    </div>
                  }
                >
                  <EnhancedNewsFeed bioguideId={bioguideId} representative={representative} />
                </Suspense>
              </div>
            )}
          </LoadingErrorBoundary>
        )}
      </div>
    </>
  );
}
