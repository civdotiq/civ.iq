/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  User,
  FileText,
  Vote,
  DollarSign,
  Newspaper,
  Users,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import { VotingTab } from '../tabs/VotingTab';
import { BillsTab } from '../tabs/BillsTab';
import { FinanceTab } from '../tabs/FinanceTab';
import { extractTransparencyMetadata, type DataMetadata } from '@/components/ui/DataTransparency';

// Types for tab data
interface Vote {
  id: string;
  date: string;
  bill?: {
    number: string;
    title: string;
    url?: string;
  };
  question?: string;
  description: string;
  position: 'Yea' | 'Nay' | 'Present' | 'Not Voting';
  result: 'Passed' | 'Failed' | 'Agreed to' | 'Disagreed to';
  chamber: 'House' | 'Senate';
  category?: string;
}

interface Bill {
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
}

interface FinanceData {
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
}

interface EnhancedTabsProps {
  bioguideId: string;
  representative: {
    name: string;
    chamber: string;
    party: string;
    state: string;
    district?: string;
    title?: string;
    bio?: {
      birthday?: string;
      gender?: 'M' | 'F';
      religion?: string;
    };
    currentTerm?: {
      start: string;
      end: string;
      office?: string;
      phone?: string;
      address?: string;
      website?: string;
      contactForm?: string;
    };
    socialMedia?: {
      twitter?: string;
      facebook?: string;
      youtube?: string;
      instagram?: string;
    };
    committees?: Array<{
      name: string;
      role?: string;
    }>;
  };
  serverData?: {
    bills?: unknown[];
    votes?: unknown[];
    finance?: Record<string, unknown>;
    news?: unknown[];
  };
}

interface TabData {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  content: React.ReactNode;
  count?: number;
}

export function EnhancedTabs({ bioguideId, representative, serverData }: EnhancedTabsProps) {
  const [activeTab, setActiveTab] = useState('profile');
  const [tabData, setTabData] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch data for a specific tab
  const fetchTabData = async (tabId: string) => {
    if (tabId === 'profile') {
      setTabData(prev => ({ ...prev, [tabId]: representative }));
      return;
    }

    // Check if we have server data first
    if (serverData) {
      const serverDataMap: Record<string, unknown> = {
        bills: serverData.bills,
        votes: serverData.votes,
        finance: serverData.finance,
        news: serverData.news,
      };

      if (serverDataMap[tabId]) {
        setTabData(prev => ({ ...prev, [tabId]: serverDataMap[tabId] }));
        return;
      }
    }

    // Fallback to API fetch
    setLoading(prev => ({ ...prev, [tabId]: true }));
    setErrors(prev => ({ ...prev, [tabId]: '' }));

    try {
      const endpoint = `/api/representative/${bioguideId}/${tabId}`;
      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setTabData(prev => ({ ...prev, [tabId]: data }));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Error fetching ${tabId} data:`, error);
      setErrors(prev => ({
        ...prev,
        [tabId]: error instanceof Error ? error.message : 'Failed to load data',
      }));
    } finally {
      setLoading(prev => ({ ...prev, [tabId]: false }));
    }
  };

  // Load data when tab changes
  useEffect(() => {
    fetchTabData(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, bioguideId]);

  // Profile tab content
  const ProfileContent = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-blue-500" />
            Basic Information
          </h4>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-gray-600">Full Name:</dt>
              <dd className="font-medium">{representative.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Title:</dt>
              <dd className="font-medium">{representative.title || representative.chamber}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Party:</dt>
              <dd className="font-medium">{representative.party}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">State:</dt>
              <dd className="font-medium">
                {representative.state}
                {representative.district && `-${representative.district}`}
              </dd>
            </div>
          </dl>
        </div>

        {/* Contact Information */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-4">Contact Information</h4>
          <dl className="space-y-2">
            {representative.currentTerm?.phone && (
              <div className="flex justify-between">
                <dt className="text-gray-600">Phone:</dt>
                <dd className="font-medium">{representative.currentTerm.phone}</dd>
              </div>
            )}
            {representative.currentTerm?.office && (
              <div className="flex justify-between">
                <dt className="text-gray-600">Office:</dt>
                <dd className="font-medium">{representative.currentTerm.office}</dd>
              </div>
            )}
            {representative.currentTerm?.website && (
              <div className="flex justify-between">
                <dt className="text-gray-600">Website:</dt>
                <dd>
                  <a
                    href={representative.currentTerm.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Official Website
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Committees */}
      {representative.committees && representative.committees.length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-4">Committee Assignments</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {representative.committees.map((committee, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                <div className="font-medium text-gray-900">{committee.name}</div>
                {committee.role && <div className="text-sm text-gray-600">{committee.role}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // Process data and extract metadata
  const processTabData = (tabId: string, data: unknown) => {
    let metadata: DataMetadata | null = null;
    let processedData = data;

    if (data && typeof data === 'object') {
      metadata = extractTransparencyMetadata(data as Record<string, unknown>);

      // Extract specific data structures
      if (tabId === 'bills') {
        const billsObj = data as Record<string, unknown>;
        processedData = Array.isArray(billsObj?.sponsoredLegislation)
          ? billsObj.sponsoredLegislation
          : Array.isArray(billsObj?.bills)
            ? billsObj.bills
            : [];
      } else if (tabId === 'votes') {
        const votesObj = data as Record<string, unknown>;
        processedData = Array.isArray(votesObj?.votes) ? votesObj.votes : [];
      }
    }

    return { processedData, metadata };
  };

  // Define tabs
  const tabs: TabData[] = [
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      content: <ProfileContent />,
    },
    {
      id: 'votes',
      label: 'Voting Records',
      icon: Vote,
      content: (() => {
        const { processedData, metadata } = processTabData('votes', tabData.votes);
        return (
          <VotingTab
            votes={processedData as Vote[]}
            metadata={metadata || undefined}
            loading={loading.votes}
          />
        );
      })(),
      count: Array.isArray(tabData.votes) ? tabData.votes.length : 0,
    },
    {
      id: 'bills',
      label: 'Sponsored Bills',
      icon: FileText,
      content: (() => {
        const { processedData, metadata } = processTabData('bills', tabData.bills);
        return (
          <BillsTab
            bills={processedData as Bill[]}
            metadata={metadata || undefined}
            loading={loading.bills}
          />
        );
      })(),
      count: Array.isArray(tabData.bills) ? tabData.bills.length : 0,
    },
    {
      id: 'finance',
      label: 'Campaign Finance',
      icon: DollarSign,
      content: (() => {
        const { processedData, metadata } = processTabData('finance', tabData.finance);
        return (
          <FinanceTab
            financeData={processedData as FinanceData}
            metadata={metadata || undefined}
            loading={loading.finance}
          />
        );
      })(),
    },
    {
      id: 'news',
      label: 'News',
      icon: Newspaper,
      content: (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-2">News coverage coming soon</div>
          <div className="text-sm text-gray-400">
            Recent news mentions will appear here when available
          </div>
        </div>
      ),
    },
    {
      id: 'relationships',
      label: 'Relationships',
      icon: Users,
      content: (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-2">Relationship analysis coming soon</div>
          <div className="text-sm text-gray-400">
            Legislative partnerships and voting coalitions will appear here
          </div>
        </div>
      ),
    },
  ];

  const activeTabData = tabs.find(tab => tab.id === activeTab);

  if (isMobile) {
    // Mobile dropdown interface
    return (
      <div className="space-y-4">
        {/* Mobile Tab Selector */}
        <div className="relative">
          <select
            value={activeTab}
            onChange={e => setActiveTab(e.target.value)}
            className="appearance-none w-full bg-white border border-gray-300 rounded-lg px-4 py-3 pr-10 text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {tabs.map(tab => (
              <option key={tab.id} value={tab.id}>
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && ` (${tab.count})`}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-4 h-5 w-5 text-gray-400 pointer-events-none" />
        </div>

        {/* Error Display */}
        {errors[activeTab] && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Error loading {activeTabData?.label}</span>
            </div>
            <p className="text-red-700 text-sm mt-1">{errors[activeTab]}</p>
          </div>
        )}

        {/* Tab Content */}
        <div className="bg-white rounded-lg">{activeTabData?.content}</div>
      </div>
    );
  }

  // Desktop tab interface
  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const hasError = errors[tab.id];
            const isLoading = loading[tab.id];

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                  ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                  ${hasError ? 'text-red-600' : ''}
                `}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="ml-1 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
                {isLoading && (
                  <div className="animate-spin h-3 w-3 border border-gray-300 border-t-blue-600 rounded-full" />
                )}
                {hasError && <AlertCircle className="h-3 w-3 text-red-500" />}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Error Display */}
      {errors[activeTab] && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Error loading {activeTabData?.label}</span>
          </div>
          <p className="text-red-700 text-sm mt-1">{errors[activeTab]}</p>
          <button
            onClick={() => fetchTabData(activeTab)}
            className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
          >
            Try again
          </button>
        </div>
      )}

      {/* Tab Content */}
      <div className="bg-white rounded-lg">{activeTabData?.content}</div>
    </div>
  );
}
