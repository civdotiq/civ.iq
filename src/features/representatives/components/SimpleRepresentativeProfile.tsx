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
import { TabNavigation, TabItem } from './TabNavigation';
import { ContactInfoTab } from './ContactInfoTab';
import { TabLoadingSpinner } from '@/lib/utils/code-splitting';
import { ClusteredNewsSection } from '@/features/news/components/ClusteredNewsSection';
import {
  RepresentativeIcon,
  StatisticsIcon,
  LegislationIcon,
  FinanceIcon,
  NewsIcon,
  IntelligenceIcon,
  LobbyingIcon,
} from '@/components/icons/AicherIcons';
import { ALL_COMMITTEE_MAPPINGS } from '@/lib/connections/committee-agency-map';
import { ErrorBoundary } from '@/components/shared/common/ErrorBoundary';

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

const IntelligenceTab = dynamic(
  () =>
    import('@/components/intelligence/IntelligenceTab').then(mod => ({
      default: mod.IntelligenceTab,
    })),
  {
    loading: TabLoadingSpinner,
    ssr: false,
  }
);

const LobbyingTab = dynamic(
  () => import('./LobbyingTab').then(mod => ({ default: mod.LobbyingTab })),
  {
    loading: TabLoadingSpinner,
    ssr: false,
  }
);

interface SimpleRepresentativeProfileProps {
  representative: EnhancedRepresentative;
}

/** Derive committee codes from committee names via ALL_COMMITTEE_MAPPINGS */
function deriveCommitteeCodes(committees?: Array<{ name: string }>): string[] {
  if (!committees || committees.length === 0) return [];

  const codes: string[] = [];
  for (const committee of committees) {
    const lower = committee.name.toLowerCase();
    for (const mapping of ALL_COMMITTEE_MAPPINGS) {
      if (
        lower.includes(mapping.committeeName.toLowerCase()) ||
        mapping.committeeName.toLowerCase().includes(lower)
      ) {
        codes.push(mapping.committeeCode);
        break;
      }
    }
  }
  return codes;
}

/** Derive focus areas from committee names */
function deriveFocusAreas(committees?: Array<{ name: string }>): string[] {
  if (!committees || committees.length === 0) return [];

  // Map common committee name keywords to short labels
  const keywordMap: Record<string, string> = {
    'armed services': 'Defense',
    defense: 'Defense',
    veterans: 'Veterans',
    judiciary: 'Judiciary',
    finance: 'Finance',
    banking: 'Banking',
    budget: 'Budget',
    appropriations: 'Appropriations',
    energy: 'Energy',
    commerce: 'Commerce',
    agriculture: 'Agriculture',
    education: 'Education',
    'foreign relations': 'Foreign Relations',
    'foreign affairs': 'Foreign Affairs',
    intelligence: 'Intelligence',
    homeland: 'Homeland Security',
    health: 'Health',
    environment: 'Environment',
    transportation: 'Transportation',
    'small business': 'Small Business',
    science: 'Science',
    'natural resources': 'Natural Resources',
    oversight: 'Oversight',
    rules: 'Rules',
    ethics: 'Ethics',
    'ways and means': 'Ways & Means',
  };

  const areas = new Set<string>();
  for (const committee of committees) {
    const lower = committee.name.toLowerCase();
    for (const [keyword, label] of Object.entries(keywordMap)) {
      if (lower.includes(keyword) && areas.size < 4) {
        areas.add(label);
        break;
      }
    }
  }

  return Array.from(areas);
}

/** Get the data sources relevant to a specific tab */
function getDataSourcesForTab(tabId: string): Array<{
  color: string;
  bgColor: string;
  name: string;
  description: string;
}> {
  const congress = {
    color: 'border-civiq-blue',
    bgColor: 'bg-civiq-blue',
    name: 'Congress.gov',
    description: 'Bills, votes, committees',
  };
  const fec = {
    color: 'border-civiq-green',
    bgColor: 'bg-civiq-green',
    name: 'FEC.gov',
    description: 'Campaign finance data',
  };
  const legislators = {
    color: 'border-civiq-red',
    bgColor: 'bg-civiq-red',
    name: 'Congress-Legislators',
    description: 'Biographical information',
  };
  const googleNews = {
    color: 'border-gray-600',
    bgColor: 'bg-gray-600',
    name: 'Google News',
    description: 'Recent media coverage',
  };
  const senateLda = {
    color: 'border-gray-600',
    bgColor: 'bg-gray-600',
    name: 'Senate LDA',
    description: 'Lobbying disclosure filings',
  };

  switch (tabId) {
    case 'overview':
      return [congress, legislators];
    case 'voting':
    case 'legislation':
      return [congress];
    case 'finance':
      return [fec];
    case 'lobbying':
      return [senateLda, fec];
    case 'intelligence':
      return [congress, fec];
    case 'news':
      return [googleNews];
    default:
      return [congress, fec, legislators];
  }
}

// Memoized component to prevent unnecessary re-renders
export const SimpleRepresentativeProfile = React.memo<SimpleRepresentativeProfileProps>(
  ({ representative }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set(['overview']));
    const prefetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

    // Memoize committee codes to avoid re-creation on every render
    const committeeCodes = useMemo(
      () => deriveCommitteeCodes(representative.committees),
      [representative.committees]
    );

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
                    : tabId === 'lobbying'
                      ? 'lobbying'
                      : null;
            if (endpoint) {
              const url = `/api/representative/${representative.bioguideId}/${endpoint}`;
              preload(url, () =>
                fetch(url).then(res => {
                  if (!res.ok) throw new Error(`HTTP ${res.status}`);
                  return res.json();
                })
              );
            }
            // Also prefetch influence-chain data for lobbying/intelligence tabs
            if ((tabId === 'lobbying' || tabId === 'intelligence') && committeeCodes.length > 0) {
              const chainUrl = `/api/intelligence/representative/${representative.bioguideId}/influence-chain`;
              preload(chainUrl, () =>
                fetch(chainUrl).then(res => {
                  if (!res.ok) throw new Error(`HTTP ${res.status}`);
                  return res.json();
                })
              );
            }
          }
        }, 200);
      },
      [representative.bioguideId, loadedTabs, committeeCodes]
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

    // Compute next election year
    const nextElection = useMemo(() => {
      const currentYear = new Date().getFullYear();
      if (representative.chamber === 'House') {
        return currentYear % 2 === 0 ? currentYear : currentYear + 1;
      }
      if (representative.currentTerm?.end) {
        return new Date(representative.currentTerm.end).getFullYear();
      }
      return null;
    }, [representative.chamber, representative.currentTerm?.end]);

    // Compute focus areas from committees
    const focusAreas = useMemo(
      () => deriveFocusAreas(representative.committees),
      [representative.committees]
    );

    // Build tabs — counts are already shown in the hero stats section
    const tabsWithBadges: TabItem[] = useMemo(
      () => [
        {
          id: 'overview',
          label: 'Overview',
          icon: <RepresentativeIcon className="w-4 h-4" />,
          description: 'Personal details and committee memberships',
        },
        {
          id: 'voting',
          label: 'Voting Records',
          icon: <StatisticsIcon className="w-4 h-4" />,
          description: 'Voting history and positions',
        },
        {
          id: 'legislation',
          label: 'Sponsored Bills',
          icon: <LegislationIcon className="w-4 h-4" />,
          description: 'Bills sponsored and co-sponsored',
        },
        {
          id: 'finance',
          label: 'Campaign Finance',
          icon: <FinanceIcon className="w-4 h-4" />,
          description: 'Fundraising and expenditures',
        },
        {
          id: 'lobbying',
          label: 'Lobbying',
          icon: <LobbyingIcon className="w-4 h-4" />,
          description: 'Who lobbies your representative and how much they spend',
        },
        {
          id: 'intelligence',
          label: 'Intelligence',
          icon: <IntelligenceIcon className="w-4 h-4" />,
          description: 'AI-powered analysis of finance, voting, and committee patterns',
        },
        {
          id: 'news',
          label: 'Recent News',
          icon: <NewsIcon className="w-4 h-4" />,
          description: 'Recent media coverage',
        },
      ],
      []
    );

    // Get data sources for current tab
    const dataSources = useMemo(() => getDataSourcesForTab(activeTab), [activeTab]);

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
              representativeName={representative.name}
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
        case 'lobbying':
          return (
            <LobbyingTab
              bioguideId={representative.bioguideId}
              hasCommittees={committeeCodes.length > 0}
            />
          );
        case 'intelligence':
          return (
            <IntelligenceTab
              bioguideId={representative.bioguideId}
              committeeCodes={committeeCodes}
            />
          );
        case 'news':
          return (
            <ClusteredNewsSection
              representative={representative}
              initialLimit={20}
              className="-mx-6 -my-6 p-6"
            />
          );
        default:
          return <ContactInfoTab representative={representative} />;
      }
    }, [
      activeTab,
      representative,
      batchData,
      batchLoading,
      batchError,
      summaryData,
      committeeCodes,
    ]);

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          {/* Unified Hero Section with Stats */}
          <div className="mb-rhythm-section">
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
              onStatClick={handleTabChange}
              nextElection={nextElection}
              focusAreas={focusAreas}
            />
          </div>

          {/* Main Content Area - Full width with tabs */}
          <div className="bg-white aicher-border mb-rhythm-section">
            {/* Tab Navigation with hover prefetch and dynamic badges */}
            <TabNavigation
              tabs={tabsWithBadges}
              activeTab={activeTab}
              onTabChange={handleTabChange}
              onTabHover={handleTabHover}
            />

            {/* Tab Content with responsive padding, error boundary, and Suspense */}
            <div className="p-4 sm:p-6">
              <ErrorBoundary
                key={activeTab}
                fallback={({ error: _error, retry }) => (
                  <div className="border-2 border-gray-200 p-6 text-center min-h-[200px] flex flex-col items-center justify-center">
                    <p className="type-sm text-gray-500">
                      This tab failed to load. Please try again.
                    </p>
                    <button
                      onClick={retry}
                      className="mt-3 type-xs text-[#3ea2d4] aicher-heading-wide py-2 min-h-[44px] inline-flex items-center aicher-focus"
                    >
                      Retry
                    </button>
                  </div>
                )}
              >
                <Suspense fallback={<TabLoadingSpinner />}>{renderActiveTab}</Suspense>
              </ErrorBoundary>
            </div>
          </div>

          {/* Data Sources Attribution - context-aware */}
          <div className="bg-white aicher-border p-4 sm:p-6">
            <h3 className="aicher-heading type-lg text-gray-900 mb-4 sm:mb-6">Data Sources</h3>
            <div
              className={`grid grid-cols-1 gap-4 sm:gap-6 ${dataSources.length === 1 ? '' : dataSources.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}
            >
              {dataSources.map(source => (
                <div key={source.name} className="flex items-center gap-3">
                  <div className={`aicher-border ${source.color} ${source.bgColor} w-4 h-4`}></div>
                  <div>
                    <div className="aicher-heading-wide type-sm text-gray-900">{source.name}</div>
                    <div className="type-xs text-gray-600">{source.description}</div>
                  </div>
                </div>
              ))}
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
