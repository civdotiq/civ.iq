/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Training Data Pipeline Types
 *
 * Schema types for the structured dataset built from live government APIs.
 * All three ML features (vote prediction, bill-lobbying similarity,
 * influence clustering) consume data in these shapes.
 */

import type { IndustrySector } from '@/lib/fec/industry-taxonomy';

/**
 * One row per (legislator, bill-vote) pair — the core training unit.
 * Used by the vote prediction model (Phase 2).
 */
export interface VoteDonorRecord {
  // Identifiers
  bioguideId: string;
  billId: string; // e.g., "hr1234-119"
  voteId: string; // e.g., "house-2025-123"

  // Target variable
  vote: 'yea' | 'nay'; // Exclude 'present' and 'not voting'

  // Legislator features
  party: 'D' | 'R' | 'I';
  chamber: 'House' | 'Senate';
  state: string;
  yearsInOffice: number;
  committeeCodes: string[];

  // Donor profile (13 sectors, normalized to % of total)
  donorProfile: Record<string, number>; // IndustrySector values as keys, sum to ~1.0
  totalDonations: number;

  // Bill features
  billSectors: IndustrySector[];
  billPolicyArea: string;
  sponsorParty: 'D' | 'R' | 'I';
  cosponsorCount: number;

  // Context
  voteDate: string; // ISO date
  electionCycle: number; // Even year
}

/**
 * Legislator donor profile — reused by clustering (Phase 4).
 */
export interface DonorProfileVector {
  bioguideId: string;
  party: 'D' | 'R' | 'I';
  chamber: 'House' | 'Senate';
  state: string;
  district?: string;
  /** 13-dimensional vector: % of donations from each sector. */
  sectorDistribution: Record<string, number>; // IndustrySector values as keys
  totalDonations: number;
  topSectors: Array<{ sector: IndustrySector; amount: number; pct: number }>;
}

/**
 * Bill + lobbying text pair — for semantic similarity (Phase 3).
 */
export interface BillLobbyingPair {
  billId: string;
  billTitle: string;
  billPolicyArea: string;
  billTextSnippet: string; // First 2000 chars of bill text
  lobbyingFilingId: string;
  lobbyingClient: string;
  lobbyingRegistrant: string;
  lobbyingIssueText: string; // specific_issues field
  lobbyingIncome: number;
  filingYear: number;
  filingPeriod: string;
}

/**
 * Metadata about the training data collection run.
 */
export interface TrainingDataMetadata {
  collectedAt: string; // ISO timestamp
  electionCycle: number;
  congress: number;
  recordCounts: {
    voteDonorRecords: number;
    donorProfiles: number;
    billLobbyingPairs: number;
  };
  dataRanges: {
    voteDateRange: { earliest: string; latest: string };
    lobbyingYearRange: { earliest: number; latest: number };
  };
  legislatorsProcessed: number;
  legislatorsSkipped: number;
  collectionDurationMs: number;
}
