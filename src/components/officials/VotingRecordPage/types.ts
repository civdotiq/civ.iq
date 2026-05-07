/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { EnhancedRepresentative } from '@/types/representative';

export type VotePosition = 'Yea' | 'Nay' | 'Present' | 'Not Voting';

export type VoteCategory =
  | 'Budget'
  | 'Healthcare'
  | 'Defense'
  | 'Judiciary'
  | 'Foreign Affairs'
  | 'Other';

export interface PartyTotals {
  yes: number;
  no: number;
  not_voting: number;
  present: number;
}

export interface PartyBreakdown {
  democratic: PartyTotals;
  republican: PartyTotals;
  independent?: PartyTotals;
}

export interface ApiVote {
  voteId: string;
  bill: {
    number: string;
    title: string;
    congress: string;
    type: string;
    url?: string;
  };
  question: string;
  result: string;
  date: string;
  position: VotePosition;
  chamber: 'House' | 'Senate';
  rollNumber: number;
  description: string;
  congressUrl?: string;
  category?: VoteCategory;
  isKeyVote?: boolean;
  total?: { yes: number; no: number; not_voting: number; present: number };
  party_breakdown?: PartyBreakdown;
  metadata: {
    source: 'house-congress-api' | 'senate-xml-feed';
    confidence: 'high' | 'medium' | 'low';
    processingDate: string;
  };
}

export interface VotesResponse {
  votes: ApiVote[];
  totalResults: number;
  member: { bioguideId: string; name: string; chamber: string };
  dataSource: string;
  success: boolean;
  error?: string;
  metadata: { timestamp: string; cached?: boolean };
}

export interface VotingRecordPageProps {
  representative: EnhancedRepresentative;
}

export type FilterState = {
  category: VoteCategory | 'All';
  position: VotePosition | 'All';
  result: 'All' | 'Passed' | 'Failed';
  year: 'All' | string;
  keyVote: 'All' | 'Key' | 'Routine';
};

export const INITIAL_FILTERS: FilterState = {
  category: 'All',
  position: 'All',
  result: 'All',
  year: 'All',
  keyVote: 'All',
};
