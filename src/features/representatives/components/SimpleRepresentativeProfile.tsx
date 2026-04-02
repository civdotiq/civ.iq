/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import useSWR from 'swr';
import { EnhancedRepresentative } from '@/types/representative';
import { HeroStatsHeader } from './HeroStatsHeader';
import { RepresentativeDashboard, REPRESENTATIVE_SECTIONS } from './RepresentativeDashboard';
import { useSectionNavigation } from '@/shared/components/dashboard';
import { ALL_COMMITTEE_MAPPINGS } from '@/lib/connections/committee-agency-map';

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
    case 'district':
      return [congress, fec, legislators];
    default:
      return [congress, fec, legislators];
  }
}

// Memoized component to prevent unnecessary re-renders
export const SimpleRepresentativeProfile = React.memo<SimpleRepresentativeProfileProps>(
  ({ representative }) => {
    const { activeSection, navigateToSection, navigateBack } = useSectionNavigation({
      validSections: [...REPRESENTATIVE_SECTIONS],
    });
    const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set(['overview']));

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

    // Track when a section is drilled into
    useEffect(() => {
      if (activeSection) {
        setLoadedTabs(prev => new Set([...prev, activeSection]));
      }
    }, [activeSection]);

    // Memoize committee codes to avoid re-creation on every render
    const committeeCodes = useMemo(
      () => deriveCommitteeCodes(representative.committees),
      [representative.committees]
    );

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

    // Get data sources for current section (or default when on grid view)
    const dataSources = useMemo(
      () => getDataSourcesForTab(activeSection ?? 'default'),
      [activeSection]
    );

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
                financeCycle: summaryData?.success ? summaryData.data?.financeCycle : undefined,
              }}
              loading={summaryLoading}
              onStatClick={navigateToSection}
              nextElection={nextElection}
              focusAreas={focusAreas}
            />
          </div>

          {/* Main Content Area - Section Dashboard */}
          <div className="bg-white aicher-border mb-rhythm-section">
            <RepresentativeDashboard
              representative={representative}
              summaryData={summaryData}
              summaryLoading={summaryLoading}
              batchData={batchData}
              batchLoading={batchLoading}
              batchError={batchError}
              committeeCodes={committeeCodes}
              activeSection={activeSection}
              onSectionSelect={navigateToSection}
              onBack={navigateBack}
            />
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
