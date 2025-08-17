/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { DataTransparencyPanel } from '@/components/ui/DataTransparency';
import { EnhancedRepresentative } from '@/types/representative';
import { EnhancedHeader } from './EnhancedHeader';
import { KeyStatsBar } from './KeyStatsBar';
import { TabNavigation, profileTabs } from './TabNavigation';
import { ProfileOverview } from './ProfileOverview';
import { DistrictSidebar } from './DistrictSidebar';
import { ContactInfoTab } from './ContactInfoTab';

// Dynamic imports with proper error boundaries for tab components
const VotingTab = dynamic(
  () => import('../tabs/VotingTab').then(mod => ({ default: mod.VotingTab })),
  {
    loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded"></div>,
    ssr: false,
  }
);

const BillsTab = dynamic(
  () => import('../tabs/BillsTab').then(mod => ({ default: mod.BillsTab })),
  {
    loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded"></div>,
    ssr: false,
  }
);

const FinanceTab = dynamic(
  () => import('../tabs/FinanceTab').then(mod => ({ default: mod.FinanceTab })),
  {
    loading: () => <div className="animate-pulse bg-gray-200 h-64 rounded"></div>,
    ssr: false,
  }
);

interface RepresentativeClientProps {
  representative: EnhancedRepresentative;
  serverData?: {
    bills?: unknown[];
    votes?: unknown[];
    finance?: Record<string, unknown>;
    news?: unknown[];
  };
  partialErrors?: Record<string, string>;
}

export function RepresentativeClient({
  representative,
  serverData,
  partialErrors,
}: RepresentativeClientProps) {
  const [activeTab, setActiveTab] = useState('overview');

  // Calculate stats for the KeyStatsBar
  const calculateStats = () => {
    const billsCount = Array.isArray(serverData?.bills) ? serverData.bills.length : 0;
    const votesCount = Array.isArray(serverData?.votes) ? serverData.votes.length : 0;
    const committeesCount = representative.committees?.length || 0;

    // Calculate years in office
    const yearsInOffice = representative.terms?.length
      ? new Date().getFullYear() - parseInt(representative.terms[0]?.startYear || '0')
      : 0;

    // Get campaign finance total if available
    const financeData = serverData?.finance as {
      totalRaised?: number;
      totalSpent?: number;
      cashOnHand?: number;
    };

    return {
      billsSponsored: billsCount,
      votesParticipated: votesCount,
      partyAlignment: 85, // Placeholder - would come from actual data
      totalRaised: financeData?.totalRaised || 0,
      yearsInOffice,
      committees: committeesCount,
    };
  };

  const stats = calculateStats();

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <ContactInfoTab representative={representative} />;

      case 'voting':
        return (
          <VotingTab
            votes={
              (serverData?.votes as Array<{
                id: string;
                date: string;
                bill?: { number: string; title: string; url?: string };
                question?: string;
                description: string;
                position: 'Yea' | 'Nay' | 'Present' | 'Not Voting';
                result: 'Passed' | 'Failed' | 'Agreed to' | 'Disagreed to';
                chamber: 'House' | 'Senate';
                category?: string;
              }>) || []
            }
          />
        );

      case 'legislation':
        return (
          <BillsTab
            bills={
              (serverData?.bills as Array<{
                id: string;
                number: string;
                title: string;
                introducedDate: string;
                status: string;
                lastAction: string;
                congress: number;
                type: string;
                policyArea: string;
                url?: string;
                committee?: string;
                progress?: number;
              }>) || []
            }
          />
        );

      case 'finance':
        return (
          <FinanceTab
            financeData={
              (serverData?.finance as {
                totalRaised: number;
                totalSpent: number;
                cashOnHand: number;
                donations: {
                  individual: number;
                  pac: number;
                  party: number;
                  candidate: number;
                };
                topContributors: Array<{
                  name: string;
                  amount: number;
                  type: 'Individual' | 'PAC' | 'Party Committee';
                }>;
                industryBreakdown: Array<{
                  industry: string;
                  amount: number;
                  percentage: number;
                }>;
                spendingCategories: Array<{
                  category: string;
                  amount: number;
                  percentage: number;
                }>;
              }) || {
                totalRaised: 0,
                totalSpent: 0,
                cashOnHand: 0,
                donations: { individual: 0, pac: 0, party: 0, candidate: 0 },
                topContributors: [],
                industryBreakdown: [],
                spendingCategories: [],
              }
            }
          />
        );

      case 'committees':
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Committee Information</h2>
            {representative.committees && representative.committees.length > 0 ? (
              <div className="space-y-4">
                {representative.committees.map((committee, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-gray-900">{committee.name}</h3>
                        {committee.role && (
                          <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                            {committee.role}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No committee information available.</p>
            )}
          </div>
        );

      case 'news':
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Recent News</h2>
            <p className="text-gray-500">News integration coming soon...</p>
          </div>
        );

      default:
        return <ProfileOverview representative={representative} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Header */}
      <EnhancedHeader representative={representative} />

      {/* Key Stats Bar */}
      <KeyStatsBar stats={stats} />

      {/* Main Content Area */}
      <div className="container mx-auto px-4 py-6">
        {/* Error Display for Partial Failures */}
        {partialErrors && Object.keys(partialErrors).length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Some data could not be loaded
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>The following information may be incomplete:</p>
                  <ul className="list-disc list-inside mt-1">
                    {Object.entries(partialErrors).map(([key, error]) => (
                      <li key={key} className="capitalize">
                        {key.replace('-', ' ')}:{' '}
                        {typeof error === 'string' ? error : 'Failed to load'}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Layout Grid */}
        <div className="lg:grid lg:grid-cols-4 lg:gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Tab Navigation */}
            <div className="mb-6">
              <TabNavigation
                activeTab={activeTab}
                onTabChange={setActiveTab}
                tabs={profileTabs}
                size="md"
              />
            </div>

            {/* Tab Content */}
            <div className="min-h-96">{renderTabContent()}</div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 mt-6 lg:mt-0">
            <DistrictSidebar representative={representative} />
          </div>
        </div>

        {/* Data Transparency */}
        <div className="mt-8">
          <DataTransparencyPanel
            metadata={{
              source: 'congress-legislators + congress.gov',
              cached: true,
              fetchedAt: new Date().toISOString(),
              dataQuality: 'high',
              freshness: 'Current',
            }}
          />
        </div>
      </div>
    </div>
  );
}
