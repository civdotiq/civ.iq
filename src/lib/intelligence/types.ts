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

// ── Insight 3: Temporal Vote Pattern Shifts ──────────────────────────

/** Quarterly voting alignment data point. */
export interface QuarterData {
  /** Quarter label, e.g., "2025-Q1". */
  quarter: string;
  /** Party alignment score for this quarter (0-1). */
  alignmentScore: number;
  /** Number of votes cast in this quarter. */
  voteCount: number;
  /** Rolling 4-quarter average alignment, null if fewer than 4 quarters available. */
  rollingAverage: number | null;
}

/** A detected shift in voting alignment. */
export interface VoteShift {
  /** Quarter where the shift was detected. */
  quarter: string;
  /** Magnitude of the shift in percentage points (absolute value). */
  magnitude: number;
  /** Direction of the shift relative to trailing average. */
  direction: 'increase' | 'decrease';
  /** Contextual events that may correlate with this shift. */
  context: {
    /** Committees the legislator joined near this period. */
    newCommittees: string[];
    /** Number of large contributions received in this quarter. */
    largeContributions: number;
    /** Whether this quarter falls within 6 months of the next election. */
    electionProximity: boolean;
  };
}

/**
 * Insight: temporal shifts in a legislator's party-line voting alignment
 * over calendar quarters of the 119th Congress.
 */
export interface TemporalVoteInsight extends InsightBase {
  bioguideId: string;
  /** Quarterly alignment data points. */
  quarters: QuarterData[];
  /** Detected significant shifts (>10 percentage points from trailing average). */
  shifts: VoteShift[];
  /** Overall trend classification across all quarters. */
  overallTrend: 'stable' | 'increasing' | 'decreasing' | 'volatile';
  /** How this legislator's average alignment compares to chamber/state peers. */
  peerComparison: PeerComparison;
  /** AI-generated or statistical plain-language summary. */
  narrative: string;
}

// ── Insight 4: Lobbying-Committee-Legislation Pipeline ───────────────

/** Result of resolving a single LDA government_entities string. */
export interface GovernmentEntityResolution {
  /** Original text from the LDA filing. */
  rawText: string;
  /** Resolution outcome. */
  type: 'committee' | 'agency' | 'noise' | 'unresolved';
  /** Committee code (e.g., "SSFI") if resolved to a committee. */
  committeeCode?: string;
  /** Committee name if resolved. */
  committeeName?: string;
  /** Agency slug if resolved to an agency. */
  agencySlug?: string;
  /** Resolution confidence: 1.0 for exact, 0.85+ for fuzzy, 0 for noise. */
  confidence: number;
}

/** Activity summary for a single lobbying organization on a committee. */
export interface LobbyingOrganizationActivity {
  /** Organization name (client from LDA filing). */
  name: string;
  /** Total spending across matched filings. */
  totalSpending: number;
  /** Number of filings mentioning this committee. */
  filingCount: number;
  /** LDA issue codes appearing in their filings. */
  issueCodes: string[];
}

/** A bill matched to lobbied issues via policyArea alignment. */
export interface MatchedBill {
  /** Bill ID, e.g., "119-hr-1234". */
  id: string;
  /** Bill title. */
  title: string;
  /** Bill type (HR, S, etc.). */
  type: string;
  /** Bill number. */
  number: string;
  /** Congress number. */
  congress: number;
  /** Congress.gov policyArea. */
  policyArea: string;
  /** Date the bill was introduced. */
  introducedDate: string;
  /** LDA issue codes that map to this bill's policyArea. */
  matchedIssueCodes: string[];
}

/** Timeline alignment between lobbying activity and bill introduction. */
export interface TimelineAlignment {
  /** LDA issue code. */
  issueCode: string;
  /** Human-readable issue label. */
  issueLabel: string;
  /** Total lobbying spending on this issue for this committee. */
  lobbyingSpending: number;
  /** Number of organizations lobbying on this issue. */
  organizationCount: number;
  /** Bills whose policyArea maps to this issue code. */
  matchedBills: MatchedBill[];
}

/**
 * Insight: lobbying expenditures → committee activity → legislative output.
 * Keyed by committee, not by representative.
 */
export interface LobbyingPipelineInsight extends InsightBase {
  /** Committee code this insight is about. */
  committeeCode: string;
  /** Committee name. */
  committeeName: string;
  /** Chamber. */
  chamber: 'House' | 'Senate' | 'Joint';
  /** Total lobbying spending mentioning this committee. */
  totalSpending: number;
  /** Unique organizations lobbying this committee. */
  organizationCount: number;
  /** Total matched bills. */
  matchedBillCount: number;
  /** Top organizations by spending. */
  topOrganizations: LobbyingOrganizationActivity[];
  /** Issue-to-bill alignment. */
  issueAlignments: TimelineAlignment[];
  /** How this committee's lobbying volume compares to same-chamber peers. */
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
