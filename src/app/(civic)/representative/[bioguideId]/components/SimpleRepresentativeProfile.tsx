/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { EnhancedRepresentative } from '@/types/representative';
import { EnhancedHeader } from './EnhancedHeader';
import { KeyStatsBar } from './KeyStatsBar';
import { TabNavigation, profileTabs } from './TabNavigation';
import { DistrictSidebar } from './DistrictSidebar';
import { ContactInfoTab } from './ContactInfoTab';
import { FinanceTab } from '../tabs/FinanceTab';
import { VotingTab } from '../tabs/VotingTab';
import { BillsTab } from '../tabs/BillsTab';

interface SimpleRepresentativeProfileProps {
  representative: EnhancedRepresentative;
}

export function SimpleRepresentativeProfile({ representative }: SimpleRepresentativeProfileProps) {
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch batch data for all tabs to share between them
  const {
    data: batchData,
    error: batchError,
    isLoading: batchLoading,
  } = useSWR(
    `/api/representative/${representative.bioguideId}/batch`,
    () =>
      fetch(`/api/representative/${representative.bioguideId}/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoints: ['finance', 'bills', 'votes'] }),
      }).then(res => res.json()),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Cache for 1 minute
    }
  );

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'overview':
        return <ContactInfoTab representative={representative} />;
      case 'voting':
        return (
          <VotingTab
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
            bioguideId={representative.bioguideId}
            sharedData={batchData?.data?.finance}
            sharedLoading={batchLoading}
            sharedError={batchError}
          />
        );
      case 'news':
        return <div className="text-center py-8 text-gray-500">News feature coming soon</div>;
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
            yearsInOffice: representative.terms?.length
              ? new Date().getFullYear() - parseInt(representative.terms[0]?.startYear || '0')
              : 0,
            billsSponsored: 0, // This will be loaded by the BillsTab
            committees: representative.committees?.length || 0,
            totalRaised: 0, // This will be loaded by the FinanceTab
          }}
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
      </div>
    </div>
  );
}
