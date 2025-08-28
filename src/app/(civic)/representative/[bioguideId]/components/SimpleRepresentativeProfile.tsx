/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState } from 'react';
import { EnhancedRepresentative } from '@/types/representative';
import { EnhancedHeader } from './EnhancedHeader';
import { KeyStatsBar } from './KeyStatsBar';
import { TabNavigation, profileTabs } from './TabNavigation';
import { ProfileOverview } from './ProfileOverview';
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

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'overview':
        return <ContactInfoTab representative={representative} />;
      case 'voting':
        return <VotingTab bioguideId={representative.bioguideId} />;
      case 'legislation':
        return <BillsTab bioguideId={representative.bioguideId} />;
      case 'finance':
        return <FinanceTab bioguideId={representative.bioguideId} />;
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
          representative={representative}
          stats={{
            yearsInOffice: representative.terms?.length
              ? new Date().getFullYear() - parseInt(representative.terms[0]?.startYear || '0')
              : 0,
            billsSponsored: 0, // This will be loaded by the BillsTab
            committeesCount: representative.committees?.length || 0,
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
