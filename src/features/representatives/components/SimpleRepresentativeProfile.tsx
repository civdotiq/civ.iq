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
import { EnhancedNewsFeedWithSuspense } from '@/shared/components/ui/LazyComponents';

// Dynamically import heavy tabs to reduce initial bundle size
const FinanceTab = dynamic(
  () => import('./FinanceTab').then(mod => ({ default: mod.FinanceTab })),
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
    error: summaryError,
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
          <EnhancedNewsFeedWithSuspense
            bioguideId={representative.bioguideId}
            representative={{
              name: `${representative.firstName} ${representative.lastName}`,
              party: representative.party,
              state: representative.state,
            }}
          />
        );
      default:
        return <ContactInfoTab representative={representative} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header Section */}
        <EnhancedHeader representative={representative} />

        {/* Key Stats Bar */}
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

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">
          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm">
              {/* Tab Navigation */}
              <TabNavigation tabs={profileTabs} activeTab={activeTab} onTabChange={setActiveTab} />

              {/* Tab Content */}
              <div className="p-6">{renderActiveTab()}</div>
            </div>
          </div>

          {/* District Sidebar */}
          <div className="lg:col-span-1">
            <DistrictSidebar representative={representative} />
          </div>
        </div>

        {/* Data Sources Attribution */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Sources</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <div>
                <div className="font-medium text-sm text-gray-900">Congress.gov</div>
                <div className="text-xs text-gray-500">Bills, votes, committees</div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div>
                <div className="font-medium text-sm text-gray-900">FEC.gov</div>
                <div className="text-xs text-gray-500">Campaign finance data</div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <div>
                <div className="font-medium text-sm text-gray-900">congress-legislators</div>
                <div className="text-xs text-gray-500">Biographical information</div>
              </div>
            </div>
          </div>
          <div className="mt-4 text-xs text-gray-400">
            All data is sourced from official government APIs and repositories. Data is refreshed
            automatically and reflects the most current available information.
          </div>
        </div>
      </div>
    </div>
  );
}
