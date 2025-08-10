'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useState, Suspense, ComponentType } from 'react';
import { LoadingErrorBoundary } from '@/components/common/ErrorBoundary';
import dynamic from 'next/dynamic';
import {
  CampaignFinanceWrapper,
  BillsTrackerWrapper,
  VotingRecordsWrapper,
  NewsWrapper,
} from './DataFetchingWrappers';

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

const LazyPartyAlignmentAnalysis = dynamic(
  () => import('@/features/representatives/components/PartyAlignmentAnalysis'),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-gray-200 h-40 rounded"></div>,
  }
);

const LazyVotingRecordsTable = dynamic(
  () =>
    import('@/features/representatives/components/SafeVotingRecordsTable')
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
    import('@/features/campaign-finance/components/CampaignFinanceVisualizer').then(mod => ({
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
  _CampaignFinanceVisualizer?: ComponentType<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _EnhancedNewsFeed?: ComponentType<any>;
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
  initialData: _initialData,
  partialErrors,
  bioguideId,
  VotingRecordsTable = LazyVotingRecordsTable,
  _CampaignFinanceVisualizer = LazyCampaignFinanceVisualizer,
  _EnhancedNewsFeed = LazyEnhancedNewsFeed,
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
              { id: 'profile', label: 'Profile' },
              { id: 'voting', label: 'Voting Record' },
              { id: 'bills', label: 'Legislation' },
              { id: 'finance', label: 'Campaign Finance' },
              { id: 'news', label: 'News' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 cursor-pointer'
                }`}
              >
                {tab.label}
                {partialErrors[tab.id] && <span className="ml-1 text-xs text-red-500">⚠</span>}
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
            <div className="space-y-6">
              {/* Voting Records Header with Timestamp */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Voting Records</h3>
                <span className="text-xs text-gray-500">
                  Last updated: {new Date().toLocaleDateString()}
                </span>
              </div>

              {/* Party Alignment Analysis */}
              {representative.party && (
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

              {/* Voting records with real data fetching */}
              <VotingRecordsWrapper
                bioguideId={bioguideId}
                chamber={representative.chamber}
                VotingRecordsTable={VotingRecordsTable}
              />
            </div>
          </LoadingErrorBoundary>
        )}

        {activeTab === 'bills' && (
          <LoadingErrorBoundary>
            <div className="space-y-6">
              {/* Bills Header with Timestamp */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Sponsored Legislation</h3>
                <span className="text-xs text-gray-500">
                  Last updated: {new Date().toLocaleDateString()}
                </span>
              </div>

              {/* Bills tracker with real data fetching */}
              <BillsTrackerWrapper
                bioguideId={bioguideId}
                representative={{
                  name: representative.name,
                  chamber: representative.chamber,
                }}
                BillsTracker={
                  LazyBillsTracker as React.ComponentType<{
                    bills: unknown[];
                    representative: { name: string; chamber: string };
                  }>
                }
              />
            </div>
          </LoadingErrorBoundary>
        )}

        {activeTab === 'finance' && (
          <LoadingErrorBoundary>
            <div className="space-y-6">
              {/* Campaign Finance Header with Timestamp */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Campaign Finance</h3>
                <span className="text-xs text-gray-500">
                  Last updated: {new Date().toLocaleDateString()}
                </span>
              </div>

              {/* Campaign Finance with real data fetching */}
              <CampaignFinanceWrapper
                bioguideId={bioguideId}
                representative={{
                  name: representative.name,
                  party: representative.party,
                }}
                CampaignFinanceVisualizer={
                  LazyCampaignFinanceVisualizer as React.ComponentType<{
                    financeData: unknown;
                    representative: { name: string; party: string };
                    bioguideId: string;
                  }>
                }
              />
            </div>
          </LoadingErrorBoundary>
        )}

        {activeTab === 'news' && (
          <LoadingErrorBoundary>
            <div className="space-y-6">
              {/* News Header with Timestamp */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Recent News</h3>
                <span className="text-xs text-gray-500">
                  Last updated: {new Date().toLocaleDateString()}
                </span>
              </div>

              {/* News feed with real data fetching */}
              <NewsWrapper
                bioguideId={bioguideId}
                representative={{
                  name: representative.name,
                  party: representative.party,
                  state: representative.state,
                }}
                EnhancedNewsFeed={
                  LazyEnhancedNewsFeed as React.ComponentType<{
                    bioguideId: string;
                    representative: { name: string; party: string; state: string };
                  }>
                }
              />
            </div>
          </LoadingErrorBoundary>
        )}
      </div>
    </>
  );
}
