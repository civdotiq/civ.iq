/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * District Intelligence Profile Types
 *
 * Types for the computed district profile that answers:
 * "Does my representative work for my district?"
 */

import type { IndustrySector } from '@/lib/fec/industry-taxonomy';
import type { InsightBase } from '@/lib/intelligence/types';
import type { TemporalBucket } from './temporal-types';

export interface SectorConcentration {
  sector: IndustrySector;
  /** Percentage of district economy in this sector (from BLS/Census) */
  economicShare: number;
  /** Dollar amount of federal spending in this sector (from USASpending) */
  federalSpending: number;
  /** Number of pending bills affecting this sector */
  pendingBills: number;
}

export interface RepresentationAlignment {
  bioguideId: string;
  name: string;
  party: string;
  chamber: string;
  /** 0-1: How well do the rep's votes align with district economic interests? */
  voteAlignmentScore: number | null;
  /** 0-1: Do the rep's committees cover the district's top sectors? */
  jurisdictionCoverage: number | null;
  /** 0-1: Do the rep's donors match the district's economy? */
  fundingAlignmentScore: number | null;
  /** Composite score: weighted average of the three above */
  overallAlignment: number | null;
  /** Trend from temporal mesh */
  alignmentTrend: 'increasing' | 'decreasing' | 'stable';
}

export interface PeerDistrict {
  districtId: string;
  state: string;
  district: string;
  /** Cosine similarity of economic sector vectors */
  economicSimilarity: number;
  /** The peer district's rep alignment score (for comparison) */
  repAlignmentScore: number | null;
  /** Difference: peer alignment - this district's alignment */
  alignmentDelta: number | null;
}

export interface BillExposure {
  billId: string;
  title: string;
  /** Which district sectors this bill affects */
  affectedSectors: IndustrySector[];
  /** Bill status */
  status: string;
  /** Relevance score (reuses existing district-bills scoring) */
  relevanceScore: number;
}

export interface DistrictProfile extends InsightBase {
  districtId: string;
  state: string;
  district: string;

  /** Economic DNA */
  topSectors: SectorConcentration[];
  federalSpendingTotal: number;
  federalSpendingPerCapita: number | null;
  topAgencies: Array<{ name: string; slug: string; amount: number }>;

  /** Representation Alignment */
  representatives: RepresentationAlignment[];

  /** Legislative Exposure */
  pendingBillExposure: BillExposure[];

  /** Peer Districts */
  peerDistricts: PeerDistrict[];

  /** Temporal alignment history */
  alignmentHistory: TemporalBucket[];

  /** AI or statistical narrative */
  narrative: string;
}

/** Precomputed economic vector for a district (13 dimensions, one per IndustrySector). */
export interface DistrictVector {
  districtId: string;
  state: string;
  district: string;
  /** Normalized sector vector (sums to 1) */
  vector: number[];
  /** Top peer districts by cosine similarity */
  peers: Array<{ districtId: string; similarity: number }>;
}
