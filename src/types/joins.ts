/**
 * Join Types
 *
 * Shared TypeScript interfaces for cross-domain join endpoint responses.
 * These types define the envelope and payload shapes used by endpoints
 * that connect bills, spending, votes, finance, and regulations.
 *
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { BillStatus, BillVote } from '@/types/bill';
import type { FederalRegisterItem } from '@/types/federal-register';
import type { FederalAward } from '@/types/spending';
import type { IndustrySector } from '@/lib/fec/industry-taxonomy';

/**
 * Standard metadata envelope for all join responses.
 * Tells the consumer where data came from and how complete it is.
 */
export interface JoinMetadata {
  generatedAt: string;
  dataSources: string[];
  joinType: string;
  dataQuality: 'complete' | 'partial' | 'degraded';
  cacheHit?: boolean;
}

/**
 * Gap 1: Bill <-> Spending connection.
 * Links a bill's policy area / committees to related federal awards.
 */
export interface BillSpendingConnection {
  billId: string;
  billTitle: string;
  policyArea: string | null;
  relatedAgencies: string[];
  spending: {
    awards: FederalAward[];
    totalAmount: number;
    awardCount: number;
  };
  metadata: JoinMetadata;
}

/**
 * Gap 3: Campaign Finance <-> Committee Jurisdiction overlap.
 * Shows which industry sectors fund members on a given committee.
 */
export interface FinanceJurisdictionOverlap {
  committeeCode: string;
  committeeName: string;
  jurisdictionTopics: string[];
  industrySectors: IndustrySector[];
  members: Array<{
    bioguideId: string;
    name: string;
    party: string;
    topSectors: Array<{
      sector: IndustrySector;
      amount: number;
    }>;
  }>;
  metadata: JoinMetadata;
}

/**
 * Gap 4: Bill -> Votes response.
 * Enriched bill vote data with party breakdowns.
 */
export interface BillVotesResponse {
  billId: string;
  billTitle: string;
  votes: BillVote[];
  summary: {
    totalVotes: number;
    passedCount: number;
    failedCount: number;
  };
  metadata: JoinMetadata;
}

/**
 * Gap 6: Cross-domain search by policy area.
 * Given a policyArea, returns related items from multiple domains.
 */
export interface PolicyAreaResults {
  policyArea: string;
  bills: Array<{
    id: string;
    title: string;
    status: BillStatus;
    introducedDate: string;
  }>;
  regulations: FederalRegisterItem[];
  spending: {
    totalAmount: number;
    topAgencies: Array<{ name: string; amount: number }>;
  };
  committees: Array<{
    code: string;
    name: string;
    chamber: 'House' | 'Senate' | 'Joint';
  }>;
  metadata: JoinMetadata;
}

/**
 * Gap 7: Bill lifecycle tracking entry.
 * A single event in a bill's journey from introduction to enactment.
 */
export interface BillLifecycleEntry {
  date: string;
  event: string;
  status: BillStatus;
  chamber: 'House' | 'Senate' | null;
  details: string | null;
  relatedVote?: {
    voteId: string;
    result: string;
    yea: number;
    nay: number;
  };
  relatedRegulation?: {
    documentNumber: string;
    title: string;
    type: string;
  };
}
