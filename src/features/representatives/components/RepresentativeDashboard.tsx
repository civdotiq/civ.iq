/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { EnhancedRepresentative } from '@/types/representative';
import { ContactInfoTab } from './ContactInfoTab';
import { VoteResponse } from './VotingTab';
import { BillsResponse } from './BillsTab';
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
  DistrictIcon,
} from '@/components/icons/AicherIcons';
import { SectionDashboard, SectionCardConfig } from '@/shared/components/dashboard';

// Dynamically import heavy section content to reduce initial bundle size
const FinanceTab = dynamic(
  () =>
    import('@/features/campaign-finance/components/CampaignFinanceVisualizer').then(mod => ({
      default: mod.CampaignFinanceVisualizer,
    })),
  { loading: TabLoadingSpinner, ssr: false }
);

const VotingTabComponent = dynamic(
  () => import('./VotingTab').then(mod => ({ default: mod.VotingTab })),
  { loading: TabLoadingSpinner, ssr: false }
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
  { loading: TabLoadingSpinner, ssr: false }
);

const LobbyingTab = dynamic(
  () => import('./LobbyingTab').then(mod => ({ default: mod.LobbyingTab })),
  { loading: TabLoadingSpinner, ssr: false }
);

const DistrictTab = dynamic(
  () => import('./DistrictTab').then(mod => ({ default: mod.DistrictTab })),
  { loading: TabLoadingSpinner, ssr: false }
);

/** Shape of the summary API response from /api/representative/.../batch?summary=true */
interface SummaryApiResponse {
  success?: boolean;
  data?: {
    billsSponsored?: number;
    billsCosponsored?: number;
    totalRaised?: number;
    totalSpent?: number;
    cashOnHand?: number;
    votesParticipated?: number;
    finance?: Record<string, unknown>;
  };
}

/** Shape of the batch API response from /api/representative/.../batch (POST) */
interface BatchApiResponse {
  success?: boolean;
  data?: {
    votes?: VoteResponse;
    bills?: BillsResponse;
    finance?: Record<string, unknown>;
  };
}

interface RepresentativeDashboardProps {
  representative: EnhancedRepresentative;
  summaryData: SummaryApiResponse | undefined;
  summaryLoading: boolean;
  batchData: BatchApiResponse | undefined;
  batchLoading: boolean;
  batchError: Error | undefined;
  committeeCodes: string[];
  activeSection: string | null;
  onSectionSelect: (id: string) => void;
  onBack: () => void;
}

/** Format currency for card stat display */
function formatCurrency(amount: number): string {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

/** Section IDs for validation */
export const REPRESENTATIVE_SECTIONS = [
  'overview',
  'voting',
  'legislation',
  'finance',
  'lobbying',
  'intelligence',
  'news',
  'district',
] as const;

export type RepresentativeSection = (typeof REPRESENTATIVE_SECTIONS)[number];

export const RepresentativeDashboard: React.FC<RepresentativeDashboardProps> = ({
  representative,
  summaryData,
  summaryLoading,
  batchData,
  batchLoading,
  batchError,
  committeeCodes,
  activeSection,
  onSectionSelect,
  onBack,
}) => {
  const summary = summaryData?.success ? summaryData.data : null;

  // Derive term range from representative data
  const termRange = useMemo(() => {
    if (!representative.currentTerm) return undefined;
    const start = representative.currentTerm.start
      ? new Date(representative.currentTerm.start).getFullYear()
      : undefined;
    const end = representative.currentTerm.end
      ? new Date(representative.currentTerm.end).getFullYear()
      : undefined;
    if (start && end) return `${start}\u2013${end}`;
    if (start) return `${start}\u2013present`;
    return undefined;
  }, [representative.currentTerm]);

  // Build section configs with live data
  const sections: SectionCardConfig[] = useMemo(
    () => [
      {
        id: 'overview',
        title: 'Profile',
        description: 'Personal details and committee memberships',
        icon: <RepresentativeIcon className="w-5 h-5" />,
        stats: [
          { label: 'Committees', value: representative.committees?.length ?? 0 },
          { label: 'Term', value: termRange },
        ],
        loading: false,
      },
      {
        id: 'voting',
        title: 'Voting Records',
        description: 'Voting history and positions on legislation',
        icon: <StatisticsIcon className="w-5 h-5" />,
        stats: [{ label: 'Votes Cast', value: summary?.votesParticipated }],
        loading: summaryLoading,
      },
      {
        id: 'legislation',
        title: 'Sponsored Bills',
        description: 'Bills sponsored and co-sponsored in Congress',
        icon: <LegislationIcon className="w-5 h-5" />,
        stats: [
          { label: 'Sponsored', value: summary?.billsSponsored },
          { label: 'Cosponsored', value: summary?.billsCosponsored },
        ],
        loading: summaryLoading,
      },
      {
        id: 'finance',
        title: 'Campaign Finance',
        description: 'Fundraising, expenditures, and donor breakdown',
        icon: <FinanceIcon className="w-5 h-5" />,
        stats: [
          {
            label: 'Raised',
            value: summary?.totalRaised ? formatCurrency(summary.totalRaised) : undefined,
          },
          {
            label: 'Spent',
            value: summary?.totalSpent ? formatCurrency(summary.totalSpent) : undefined,
          },
        ],
        loading: summaryLoading,
      },
      {
        id: 'lobbying',
        title: 'Lobbying',
        description:
          'Who lobbies your representative, which industries spend the most, and how lobbying connects to committee assignments',
        icon: <LobbyingIcon className="w-5 h-5" />,
        stats: [],
      },
      {
        id: 'intelligence',
        title: 'Intelligence',
        description:
          'AI-powered analysis of voting patterns, campaign finance correlations, and committee activity',
        icon: <IntelligenceIcon className="w-5 h-5" />,
        stats: [],
      },
      {
        id: 'news',
        title: 'Recent News',
        description: 'Latest media coverage and press mentions from national and local sources',
        icon: <NewsIcon className="w-5 h-5" />,
        stats: [],
      },
      {
        id: 'district',
        title: 'District',
        description:
          'District demographics, federal spending, upcoming hearings, and local officials',
        icon: <DistrictIcon className="w-5 h-5" />,
        stats: [],
      },
    ],
    [representative.committees, termRange, summary, summaryLoading]
  );

  // Render the full content for a given section
  const renderSection = useMemo(() => {
    return (sectionId: string) => {
      switch (sectionId) {
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
        case 'district':
          return <DistrictTab bioguideId={representative.bioguideId} />;
        default:
          return <ContactInfoTab representative={representative} />;
      }
    };
  }, [representative, batchData, batchLoading, batchError, summaryData, committeeCodes]);

  return (
    <SectionDashboard
      sections={sections}
      activeSection={activeSection}
      onSectionSelect={onSectionSelect}
      onBack={onBack}
      renderSection={renderSection}
    />
  );
};

RepresentativeDashboard.displayName = 'RepresentativeDashboard';
