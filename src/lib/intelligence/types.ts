/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Intelligence Layer Type Definitions
 *
 * Shared types for all analyzers, entity resolution, and statistics.
 * Follows the pattern from src/types/joins.ts.
 */

import type { IndustrySector } from '@/lib/fec/industry-taxonomy';

// ── Base Types ───────────────────────────────────────────────────────

/**
 * Every insight carries provenance metadata.
 * Displayed on InsightCard as "Analysis based on data through [dataAsOf]".
 */
export interface InsightBase {
  /** Confidence score: 0-1. Below 0.6 = hidden, 0.6-0.8 = amber, above 0.8 = green. */
  confidence: number;
  /** ISO timestamp of the freshest source data used in this insight. */
  dataAsOf: string;
  /** Human-readable description of how this insight was computed. */
  methodology: string;
  /** Standard correlation != causation disclaimer. */
  disclaimer: string;
  /** ISO timestamp when this insight was generated. */
  lastAnalyzedAt: string;
  /** Whether AI narrative was used or fell back to statistical summary. */
  source: 'ai-generated' | 'statistical-fallback';
}

// ── Peer Comparison ──────────────────────────────────────────────────

/**
 * Comparison of a legislator's metric to their peer group.
 * Peers are legislators in the same chamber, committee, or state delegation.
 */
export interface PeerComparison {
  /** The legislator's value for this metric. */
  value: number;
  /** The peer group average for this metric. */
  peerAverage: number;
  /** How many peers were included in the comparison. */
  peerCount: number;
  /** Description of the peer group (e.g., "Senate Finance Committee members"). */
  peerGroupLabel: string;
  /** Percentile rank within the peer group (0-100). */
  percentileRank: number;
}

// ── Industry Correlation ─────────────────────────────────────────────

/**
 * Correlation between an industry sector's donations and a legislator's
 * voting alignment on bills affecting that sector.
 */
export interface IndustryCorrelation {
  sector: IndustrySector;
  /** Total donations from this sector. */
  donationAmount: number;
  /** Number of bills voted on that affect this sector. */
  billsVotedOn: number;
  /** Votes aligned with industry interest / total votes on sector bills. */
  alignmentScore: number;
  /** Whether the sample size meets the minimum threshold (10 votes). */
  meetsSampleSize: boolean;
}

// ── Insight 1: Finance-Jurisdiction Overlap ──────────────────────────

/**
 * Insight: overlap between campaign donors' industry sectors and
 * committee jurisdictions the legislator sits on.
 */
export interface FinanceJurisdictionInsight extends InsightBase {
  bioguideId: string;
  /** Total donations from sectors under committee jurisdiction / total donations. */
  overlapScore: number;
  /** Per-committee overlap breakdown. */
  committees: Array<{
    committeeCode: string;
    committeeName: string;
    /** Industry sectors under this committee's jurisdiction. */
    jurisdictionSectors: IndustrySector[];
    /** Total donations from jurisdiction sectors. */
    jurisdictionDonations: number;
    /** Percentage of total donations from jurisdiction sectors. */
    jurisdictionDonationPercentage: number;
  }>;
  /** How this legislator's overlap compares to peers on the same committees. */
  peerComparison: PeerComparison;
  /** AI-generated or statistical plain-language summary. */
  narrative: string;
}

// ── Insight 2: Vote-Finance Correlation ──────────────────────────────

/**
 * Insight: correlation between campaign finance donors (by sector) and
 * voting record (by bill industry classification).
 */
export interface VoteFinanceInsight extends InsightBase {
  bioguideId: string;
  /** Per-sector correlation between donations and voting alignment. */
  correlations: IndustryCorrelation[];
  /** Overall correlation coefficient across all sectors with sufficient data. */
  overallCorrelation: number | null;
  /** How this legislator's alignment compares to peers. */
  peerComparison: PeerComparison;
  /** AI-generated or statistical plain-language summary. */
  narrative: string;
}

// ── Ticker Resolution ────────────────────────────────────────────────

/**
 * Result of resolving a stock ticker to an industry sector.
 * Returns null for ETFs, mutual funds, and unresolvable tickers.
 */
export interface TickerResolution {
  sector: IndustrySector;
  sicCode: string;
  confidence: number;
}
