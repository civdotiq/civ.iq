/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { IndustrySector } from '@/lib/fec/industry-taxonomy';

export interface IndustrySectorPageProps {
  sector: IndustrySector;
  sectorSlug: string;
  displayName: string;
}

export interface SectorLeaderboardResponse {
  sector: string;
  sectorLabel: string;
  chamber: 'house' | 'senate' | 'all';
  party: string | null;
  entries: Array<{
    bioguideId: string;
    name: string;
    party: string;
    state: string;
    chamber: 'House' | 'Senate';
    sectorAlignmentScore: number;
    sectorDonationAmount: number;
    billsVotedOn: number;
    rank: number;
  }>;
  stats: {
    mean: number;
    median: number;
    standardDeviation: number;
    includedMembers: number;
    excludedMembers: number;
  };
  dataAvailability: {
    cachedInsights: number;
    minimumRequired: number;
    status: 'sufficient' | 'partial' | 'empty';
  };
  generatedAt: string;
  dataAsOf: string;
}

export interface IndustryOrganizationsResponse {
  topPACs: Array<{
    committeeId: string;
    name: string;
    sector: string;
    totalDisbursements: number;
  }>;
  topLobbyingOrgs: Array<{
    registrantId: string;
    name: string;
    totalSpending: number;
    filingCount: number;
  }>;
  metrics: {
    totalLobbyingSpending: number;
    activePACCount: number;
    activeLobbyingOrgCount: number;
  };
  metadata: {
    generatedAt: string;
    dataSources: string[];
  };
}

export interface IndustryConnectionsResponse {
  sector: string;
  relatedPolicyAreas: string[];
  relatedAgencies: string[];
  committees: Array<{
    code: string;
    name: string;
    chamber: 'House' | 'Senate' | 'Joint';
  }>;
  recentBills: Array<{
    id: string;
    title: string;
    type: string;
    number: string;
    congress: number;
    policyArea: string | null;
    url: string;
  }>;
  metadata: {
    generatedAt: string;
    dataSources: string[];
    joinType: string;
    dataQuality: 'complete' | 'partial' | 'degraded';
  };
}

export type LeaderboardEntry = SectorLeaderboardResponse['entries'][number];
export type ContributorRow =
  | {
      kind: 'pac';
      committeeId: string;
      name: string;
      amount: number;
      sublabel: string;
    }
  | {
      kind: 'lobby';
      registrantId: string;
      name: string;
      amount: number;
      sublabel: string;
    };
export type BillRow = IndustryConnectionsResponse['recentBills'][number];
