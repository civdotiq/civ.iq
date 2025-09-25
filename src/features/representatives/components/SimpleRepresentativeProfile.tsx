/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import useSWR from 'swr';
import { EnhancedRepresentative } from '@/types/representative';
import { EnhancedHeader } from './EnhancedHeader';
import { KeyStatsBar } from './KeyStatsBar';
import { TabNavigation, profileTabs } from './TabNavigation';
import { DistrictSidebar } from './DistrictSidebar';
import { ContactInfoTab } from './ContactInfoTab';
import { TabLoadingSpinner } from '@/lib/utils/code-splitting';
import { ClusteredNewsFeed } from '@/features/news/components/ClusteredNewsFeed';

// Dynamically import heavy tabs to reduce initial bundle size
const FinanceTab = dynamic(
  () => import('./FinanceTabEnhanced').then(mod => ({ default: mod.FinanceTabEnhanced })),
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

export function SimpleRepresentativeProfile({ representative }: SimpleRepresentativeProfileProps) {
  const [activeTab, setActiveTab] = useState('overview');

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

  // Fetch full batch data for tabs (excluding votes for now to improve performance)
  const {
    data: batchData,
    error: batchError,
    isLoading: batchLoading,
  } = useSWR(
    `batch-no-votes-${representative.bioguideId}`,
    async () => {
      const response = await fetch(`/api/representative/${representative.bioguideId}/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoints: ['bills', 'finance'], // Exclude votes for better performance
          options: {
            bills: { summaryOnly: true },
            finance: { summaryOnly: true },
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Cache for 1 minute
      shouldRetryOnError: true,
      errorRetryCount: 2,
    }
  );

  const renderActiveTab = () => {
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
            sharedData={undefined}
            sharedLoading={false}
            sharedError={null}
          />
        );
      case 'finance':
        return (
          <FinanceTab
            bioguideId={representative.bioguideId}
            sharedData={batchData?.data?.finance}
            sharedLoading={batchLoading}
            sharedError={batchError}
          />
        );
      case 'news':
        return (
          <ClusteredNewsFeed
            representative={representative}
            viewMode="headlines"
            maxClusters={8}
            autoRefresh={true}
            refreshInterval={300000}
            className="-mx-6 -my-6 p-6"
          />
        );
      default:
        return <ContactInfoTab representative={representative} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div
        className="max-w-7xl mx-auto px-4 md:px-8"
        style={{ padding: 'calc(var(--grid) * 2) calc(var(--grid) * 2) calc(var(--grid) * 4)' }}
      >
        {/* Header Section */}
        <div style={{ marginBottom: 'calc(var(--grid) * 4)' }}>
          <EnhancedHeader representative={representative} />
        </div>

        {/* Key Stats Bar */}
        <div style={{ marginBottom: 'calc(var(--grid) * 4)' }}>
          <KeyStatsBar
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

        {/* Main Content Layout - 2 column with improved spacing */}
        <div
          className="grid grid-cols-1 lg:grid-cols-[1fr_320px]"
          style={{
            gap: 'calc(var(--grid) * 4)',
            marginBottom: 'calc(var(--grid) * 6)',
          }}
        >
          {/* Main Content Area - White bordered box */}
          <div className="bg-white aicher-border">
            {/* Tab Navigation */}
            <TabNavigation tabs={profileTabs} activeTab={activeTab} onTabChange={setActiveTab} />

            {/* Tab Content with consistent padding */}
            <div style={{ padding: 'calc(var(--grid) * 4)' }}>{renderActiveTab()}</div>
          </div>

          {/* Sidebar - Stack of bordered cards */}
          <div>
            <DistrictSidebar representative={representative} />
          </div>
        </div>

        {/* Data Sources Attribution - improved spacing */}
        <div className="bg-white aicher-border" style={{ padding: 'calc(var(--grid) * 4)' }}>
          <h3
            className="aicher-heading type-lg text-gray-900"
            style={{ marginBottom: 'calc(var(--grid) * 3)' }}
          >
            Data Sources
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 'calc(var(--grid) * 3)' }}>
            <div className="flex items-center" style={{ gap: 'calc(var(--grid) * 2)' }}>
              <div
                className="aicher-border border-civiq-blue bg-civiq-blue"
                style={{ width: 'calc(var(--grid) * 2)', height: 'calc(var(--grid) * 2)' }}
              ></div>
              <div>
                <div className="aicher-heading-wide type-sm text-gray-900">Congress.gov</div>
                <div className="type-xs text-gray-600">Bills, votes, committees</div>
              </div>
            </div>
            <div className="flex items-center" style={{ gap: 'calc(var(--grid) * 2)' }}>
              <div
                className="aicher-border border-civiq-green bg-civiq-green"
                style={{ width: 'calc(var(--grid) * 2)', height: 'calc(var(--grid) * 2)' }}
              ></div>
              <div>
                <div className="aicher-heading-wide type-sm text-gray-900">FEC.gov</div>
                <div className="type-xs text-gray-600">Campaign finance data</div>
              </div>
            </div>
            <div className="flex items-center" style={{ gap: 'calc(var(--grid) * 2)' }}>
              <div
                className="aicher-border border-civiq-red bg-civiq-red"
                style={{ width: 'calc(var(--grid) * 2)', height: 'calc(var(--grid) * 2)' }}
              ></div>
              <div>
                <div className="aicher-heading-wide type-sm text-gray-900">
                  Congress-Legislators
                </div>
                <div className="type-xs text-gray-600">Biographical information</div>
              </div>
            </div>
          </div>
          <p className="type-sm text-gray-500" style={{ marginTop: 'calc(var(--grid) * 3)' }}>
            All data is sourced from official government APIs and repositories. Data is refreshed
            automatically and reflects the most current available information.
          </p>
        </div>
      </div>
    </div>
  );
}
