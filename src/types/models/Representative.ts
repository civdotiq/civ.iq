/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Core Representative model with comprehensive type definitions
 */
export interface Representative {
  readonly id: string;
  readonly bioguideId: string;
  readonly name: {
    readonly first: string;
    readonly last: string;
    readonly official_full: string;
    readonly nickname?: string;
    readonly suffix?: string;
  };
  readonly state: string;
  readonly district?: string;
  readonly party: 'Democrat' | 'Republican' | 'Independent' | 'Libertarian' | 'Green';
  readonly chamber: 'house' | 'senate' | 'House' | 'Senate';
  readonly title: string;
  readonly photo_url?: string;
  readonly contact: {
    readonly phone?: string;
    readonly website?: string;
    readonly email?: string;
    readonly office?: string;
    readonly address?: string;
  };
  readonly terms?: ReadonlyArray<RepresentativeTerm>;
  readonly currentTerm?: RepresentativeTerm;
  readonly social?: {
    readonly twitter?: string;
    readonly facebook?: string;
    readonly youtube?: string;
    readonly instagram?: string;
  };
  readonly biographical?: {
    readonly birthday?: string;
    readonly gender?: 'M' | 'F';
    readonly religion?: string;
    readonly occupation?: string;
  };
}

/**
 * Individual term of service for a representative
 */
export interface RepresentativeTerm {
  readonly type: 'rep' | 'sen';
  readonly start: string;
  readonly end: string;
  readonly state: string;
  readonly district?: string;
  readonly party: string;
  readonly phone?: string;
  readonly website?: string;
  readonly office?: string;
  readonly address?: string;
  readonly class?: number; // For senators
}

/**
 * Simplified representative response for API endpoints
 */
export interface RepresentativeResponse {
  readonly bioguideId: string;
  readonly name: string;
  readonly party: string;
  readonly state: string;
  readonly district?: string;
  readonly chamber: string;
  readonly title: string;
  readonly phone?: string;
  readonly website?: string;
  readonly contactInfo: {
    readonly phone: string;
    readonly website: string;
    readonly office: string;
  };
}

/**
 * Representative filters for search and filtering
 */
export interface RepresentativeFilters {
  readonly state?: string;
  readonly party?: string;
  readonly chamber?: 'house' | 'senate' | 'all';
  readonly committee?: string;
  readonly searchQuery?: string;
}

/**
 * Voting record for a representative
 */
export interface VotingRecord {
  readonly voteId: string;
  readonly billId?: string;
  readonly date: string;
  readonly question: string;
  readonly position: 'Yea' | 'Nay' | 'Present' | 'Not Voting';
  readonly result: string;
  readonly chamber: 'house' | 'senate';
  readonly congress?: number;
  readonly session?: number;
}

/**
 * Campaign finance data for a representative
 */
export interface CampaignFinance {
  readonly totalRaised: number;
  readonly totalSpent: number;
  readonly cashOnHand: number;
  readonly lastReportDate: string;
  readonly cycle: string;
  readonly topContributors: ReadonlyArray<{
    readonly name: string;
    readonly amount: number;
    readonly type: 'individual' | 'pac' | 'corporate';
  }>;
  readonly contributionsByIndustry?: ReadonlyArray<{
    readonly industry: string;
    readonly amount: number;
    readonly percentage: number;
  }>;
}

/**
 * Party alignment analysis for a representative
 */
export interface PartyAlignment {
  readonly partyLineVoting: number;
  readonly bipartisanBills: number;
  readonly totalVotes: number;
  readonly alignmentTrend: 'increasing' | 'decreasing' | 'stable';
  readonly congress?: number;
  readonly comparedToPeers?: {
    readonly percentile: number;
    readonly averageAlignment: number;
  };
}

/**
 * Bill information associated with a representative
 */
export interface RepresentativeBill {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly introducedDate?: string;
  readonly type: 'sponsored' | 'cosponsored';
  readonly congress?: number;
  readonly summary?: string;
}
