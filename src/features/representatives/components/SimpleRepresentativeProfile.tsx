/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState, Suspense, useCallback, useMemo, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import useSWR, { preload } from 'swr';
import { EnhancedRepresentative } from '@/types/representative';
import { HeroStatsHeader } from './HeroStatsHeader';
import { TabNavigation, profileTabs } from './TabNavigation';
import { DistrictSidebar } from './DistrictSidebar';
import { ContactInfoTab } from './ContactInfoTab';
import { TabLoadingSpinner } from '@/lib/utils/code-splitting';
import { SimpleNewsSection } from '@/features/news/components/SimpleNewsSection';
import { useIsDesktop } from '@/hooks/useMediaQuery';

// Dynamically import heavy tabs to reduce initial bundle size
const FinanceTab = dynamic(
  () =>
    import('@/features/campaign-finance/components/CampaignFinanceVisualizer').then(mod => ({
      default: mod.CampaignFinanceVisualizer,
    })),
  {
    loading: TabLoadingSpinner,
    ssr: false,
  }
);

const VotingTabComponent = dynamic(
  () => import('./VotingTab').then(mod => ({ default: mod.VotingTab })),
  {
    loading: TabLoadingSpinner,
    ssr: false,
  }
);

const BillsTab = dynamic(() => import('./BillsTab').then(mod => ({ default: mod.BillsTab })), {
  loading: TabLoadingSpinner,
  ssr: false,
});

interface SimpleRepresentativeProfileProps {
  representative: EnhancedRepresentative;
}

// Memoized component to prevent unnecessary re-renders
export const SimpleRepresentativeProfile = React.memo<SimpleRepresentativeProfileProps>(
  ({ representative }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set(['overview']));
    const prefetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isDesktop = useIsDesktop();

    // Fetch lightweight summary data for Key Stats
    const {
      data: summaryData,
      error: _summaryError,
      isLoading: summaryLoading,
    } = useSWR(
      `/api/representative/${representative.bioguideId}/batch?summary=true`,
      async () => {
        const response = await fetch(
          `/api/representative/${representative.bioguideId}/batch?summary=true`
        );
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      },
      {
        revalidateOnFocus: false,
        dedupingInterval: 300000, // Cache for 5 minutes
      }
    );

    // Lazy-load tab data only when needed
    const shouldLoadTabData = useMemo(() => {
      // Only load data for tabs that have been visited or are currently active
      return loadedTabs.has('voting') || loadedTabs.has('legislation') || loadedTabs.has('finance');
    }, [loadedTabs]);

    // Fetch full batch data for tabs only when needed
    const {
      data: batchData,
      error: batchError,
      isLoading: batchLoading,
    } = useSWR(
      shouldLoadTabData
        ? `batch-${representative.bioguideId}-${Array.from(loadedTabs).join('-')}`
        : null,
      shouldLoadTabData
        ? async () => {
            // Only fetch data for tabs that have been loaded
            const endpoints: string[] = [];
            const options: Record<string, { summaryOnly?: boolean; limit?: number }> = {};

            if (loadedTabs.has('legislation')) {
              endpoints.push('bills');
              options.bills = { summaryOnly: false, limit: 25 }; // Fetch actual bills with limit
            }
            if (loadedTabs.has('finance')) {
              endpoints.push('finance');
              options.finance = { summaryOnly: true };
            }
            if (loadedTabs.has('voting')) {
              endpoints.push('votes');
              options.votes = { limit: 50 }; // Limit initial votes load
            }

            if (endpoints.length === 0) return null;

            const response = await fetch(`/api/representative/${representative.bioguideId}/batch`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ endpoints, options }),
            });

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return response.json();
          }
        : null,
      {
        revalidateOnFocus: false,
        dedupingInterval: 60000, // Cache for 1 minute
        shouldRetryOnError: true,
        errorRetryCount: 1, // Reduced from 2 to 1 to fail faster and let individual tabs fetch
        errorRetryInterval: 2000, // Retry after 2 seconds instead of default exponential backoff
      }
    );

    // Track when a tab is selected
    useEffect(() => {
      setLoadedTabs(prev => new Set([...prev, activeTab]));
    }, [activeTab]);

    // Prefetch tab data on hover
    const handleTabHover = useCallback(
      (tabId: string) => {
        // Clear any existing timeout
        if (prefetchTimeoutRef.current) {
          clearTimeout(prefetchTimeoutRef.current);
        }

        // Set a new timeout to prefetch after 200ms hover
        prefetchTimeoutRef.current = setTimeout(() => {
          if (!loadedTabs.has(tabId)) {
            // Preload the tab's data
            const endpoint =
              tabId === 'voting'
                ? 'votes'
                : tabId === 'legislation'
                  ? 'bills'
                  : tabId === 'finance'
                    ? 'finance'
                    : null;
            if (endpoint) {
              preload(`/api/representative/${representative.bioguideId}/${endpoint}`, () =>
                fetch(`/api/representative/${representative.bioguideId}/${endpoint}`).then(res =>
                  res.json()
                )
              );
            }
          }
        }, 200);
      },
      [representative.bioguideId, loadedTabs]
    );

    // Cleanup timeout on unmount
    useEffect(() => {
      return () => {
        if (prefetchTimeoutRef.current) {
          clearTimeout(prefetchTimeoutRef.current);
        }
      };
    }, []);

    // Memoized tab change handler
    const handleTabChange = useCallback((tabId: string) => {
      setActiveTab(tabId);
    }, []);

    // Memoized tab rendering to prevent unnecessary re-renders
    const renderActiveTab = useMemo(() => {
      switch (activeTab) {
        case 'overview':
          return <ContactInfoTab representative={representative} />;
        case 'voting':
          return (
            <VotingTabComponent
              bioguideId={representative.bioguideId}
              sharedData={batchData?.data?.votes}
              sharedLoading={batchLoading}
              sharedError={batchError}
            />
          );
        case 'legislation':
          return (
            <BillsTab
              bioguideId={representative.bioguideId}
              sharedData={batchData?.data?.bills}
              sharedLoading={batchLoading}
              sharedError={batchError}
            />
          );
        case 'finance':
          return (
            <FinanceTab
              financeData={batchData?.data?.finance || summaryData?.data?.finance || {}}
              representative={{
                name: representative.name,
                party: representative.party,
              }}
              bioguideId={representative.bioguideId}
            />
          );
        case 'news':
          return (
            <SimpleNewsSection
              representative={representative}
              initialLimit={8}
              className="-mx-6 -my-6 p-6"
            />
          );
        default:
          return <ContactInfoTab representative={representative} />;
      }
    }, [activeTab, representative, batchData, batchLoading, batchError]);

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          {/* Unified Hero Section with Stats */}
          <div className="mb-4 sm:mb-6">
            <HeroStatsHeader
              representative={representative}
              stats={{
                billsSponsored: summaryData?.success
                  ? (summaryData.data?.billsSponsored ??
                    batchData?.data?.bills?.totalSponsored ??
                    batchData?.data?.bills?.currentCongress?.count)
                  : undefined,
                committees: representative.committees?.length ?? 0,
                totalRaised: summaryData?.success
                  ? summaryData.data?.totalRaised
                  : batchData?.success
                    ? batchData.data?.finance?.totalRaised
                    : undefined,
                votesParticipated: summaryData?.success
                  ? summaryData.data?.votesParticipated
                  : undefined,
              }}
              loading={summaryLoading}
            />
          </div>

          {/* Main Content Layout - 2 column with responsive spacing */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 sm:gap-6 mb-4 sm:mb-6">
            {/* Main Content Area - White bordered box */}
            <div className="bg-white aicher-border">
              {/* Tab Navigation with hover prefetch */}
              <TabNavigation
                tabs={profileTabs}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                onTabHover={handleTabHover}
              />

              {/* Tab Content with responsive padding and Suspense boundary */}
              <div className="p-4 sm:p-6">
                <Suspense fallback={<TabLoadingSpinner />}>{renderActiveTab}</Suspense>
              </div>
            </div>

            {/* Sidebar - Conditionally render based on screen size for better mobile performance */}
            {isDesktop ? (
              <div className="sticky top-4 self-start">
                <Suspense
                  fallback={
                    <div className="bg-white aicher-border p-4 sm:p-6">
                      <div className="animate-pulse">
                        <div className="h-6 bg-gray-200 rounded mb-4"></div>
                        <div className="space-y-3">
                          <div className="h-4 bg-gray-200 rounded"></div>
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    </div>
                  }
                >
                  <DistrictSidebar representative={representative} />
                </Suspense>
              </div>
            ) : (
              <details className="bg-white aicher-border">
                <summary className="p-4 font-bold cursor-pointer list-none flex justify-between items-center aicher-heading">
                  <span>District Information</span>
                  <span className="text-civiq-blue">▼</span>
                </summary>
                <div className="px-4 pb-4">
                  <Suspense
                    fallback={
                      <div className="animate-pulse space-y-3">
                        <div className="h-4 bg-gray-200 rounded"></div>
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      </div>
                    }
                  >
                    <DistrictSidebar representative={representative} />
                  </Suspense>
                </div>
              </details>
            )}
          </div>

          {/* Data Sources Attribution - responsive spacing */}
          <div className="bg-white aicher-border p-4 sm:p-6">
            <h3 className="aicher-heading type-lg text-gray-900 mb-4 sm:mb-6">Data Sources</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              <div className="flex items-center gap-3">
                <div className="aicher-border border-civiq-blue bg-civiq-blue w-4 h-4"></div>
                <div>
                  <div className="aicher-heading-wide type-sm text-gray-900">Congress.gov</div>
                  <div className="type-xs text-gray-600">Bills, votes, committees</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="aicher-border border-civiq-green bg-civiq-green w-4 h-4"></div>
                <div>
                  <div className="aicher-heading-wide type-sm text-gray-900">FEC.gov</div>
                  <div className="type-xs text-gray-600">Campaign finance data</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="aicher-border border-civiq-red bg-civiq-red w-4 h-4"></div>
                <div>
                  <div className="aicher-heading-wide type-sm text-gray-900">
                    Congress-Legislators
                  </div>
                  <div className="type-xs text-gray-600">Biographical information</div>
                </div>
              </div>
            </div>
            <p className="type-sm text-gray-500 mt-4 sm:mt-6">
              All data is sourced from official government APIs and repositories. Data is refreshed
              automatically and reflects the most current available information.
            </p>
          </div>
        </div>
      </div>
    );
  }
);

SimpleRepresentativeProfile.displayName = 'SimpleRepresentativeProfile';
