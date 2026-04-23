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
import type { PeerComparison } from '@civiq/civic-statistics';
import type { GovernmentEntityResolution, TickerResolution } from '@civiq/entity-resolution';

// Re-export types from packages so existing consumers of this file keep working
export type { PeerComparison, GovernmentEntityResolution, TickerResolution };
export type { AnomalyFlag, AnomalyResult } from '@civiq/civic-statistics';

// ── Error Reporting ──────────────────────────────────────────────────

/** Structured error from an upstream data source or internal computation. */
export interface InsightError {
  /** Data source that failed, e.g., "senate-lda", "fec-api", "congress-gov". */
  source: string;
  /** Error classification. */
  type: 'upstream_timeout' | 'upstream_error' | 'insufficient_data' | 'internal_error';
  /** Human-readable error message. */
  message: string;
  /** ISO timestamp when the error occurred. */
  timestamp: string;
  /** Per-metric attribution when an orchestrator aggregates multiple analyzers (e.g., money-report). */
  metric?: string;
  /** Subject identifier when the error is scoped to a single entity (e.g., a representative). */
  bioguideId?: string;
}

/** Wrapper for insight API responses with error reporting. */
export interface InsightResponse<T> {
  /** The insight data, or null if unavailable. */
  data: T | null;
  /** Errors encountered during computation. */
  errors: InsightError[];
  /** Whether all data sources succeeded. */
  status: 'complete' | 'partial' | 'unavailable';
}

// ── Signal Taxonomy ──────────────────────────────────────────────────

/**
 * Classifies the urgency/type of an insight for UI prioritization.
 * - alert: Anomaly or threshold breach — demands attention (amber left border)
 * - pattern: Detected statistical pattern — worth knowing (blue left border)
 * - tracking: Ongoing metric — context for later (gray, quieter)
 * - baseline: Reference comparison — no action implied (gray, most quiet)
 */
export type InsightSignal = 'alert' | 'pattern' | 'tracking' | 'baseline';

// ── Source Citation ──────────────────────────────────────────────────

/** Structured citation for a single data source used in an insight. */
export interface InsightSource {
  /** Human-readable source name, e.g., "FEC filings", "Senate LDA". */
  name: string;
  /** Time period covered, e.g., "Q3-Q4 2025", "119th Congress". */
  period: string;
  /** Number of records sampled or used, if known. */
  recordCount?: number;
}

// ── Base Types ───────────────────────────────────────────────────────

/**
 * Every insight carries provenance metadata.
 * Displayed on InsightCard as "Analysis based on data through [dataAsOf]".
 */
export interface InsightBase {
  /** Confidence score: 0-1. Below 0.6 = hidden, 0.6-0.8 = amber, above 0.8 = green. */
  confidence: number;
  /** Whether confidence was computed from data or estimated by heuristic. */
  confidenceMethod?: 'computed' | 'heuristic' | 'mixed';
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
  /** Signal classification for UI prioritization. Defaults to 'pattern' if absent. */
  signal?: InsightSignal;
  /** Structured source citations for provenance display. */
  sources?: InsightSource[];
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
  /** Weighted yea-rate across all sectors (0-1). Same units as peer comparison. */
  overallAlignment: number;
  /** How this legislator's alignment compares to peers. Null when peer cache is cold. */
  peerComparison: PeerComparison | null;
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

/** Activity summary for a single lobbying organization on a committee. */
export interface LobbyingOrganizationActivity {
  /** Organization name (client from LDA filing). */
  name: string;
  /** Senate LDA registrant ID, if this org lobbies on its own behalf. */
  registrantId?: string;
  /** Total spending across matched filings. */
  totalSpending: number;
  /** Number of filings mentioning this committee. */
  filingCount: number;
  /** LDA issue codes appearing in their filings. */
  issueCodes: string[];
  /** Stance toward legislation detected via zero-shot NLI, if available. */
  stance?: StanceClassification;
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

// ── Insight 5: PAC-to-Legislator Vote Tracing ────────────────────────

/** Voting record for a single PAC recipient legislator. */
export interface PACRecipientVoteRecord {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  chamber: 'House' | 'Senate';
  amountReceived: number;
  relevantVoteCount: number;
  /** Fraction of yea votes on PAC-relevant bills (0-1). */
  yeaRate: number;
  /** Party-wide yea rate on the same bills (0-1). */
  partyBaselineYeaRate: number;
  /** yeaRate - partyBaselineYeaRate. */
  differenceFromBaseline: number;
}

/**
 * Insight: PAC contributions traced to legislators' voting records.
 * Answers: "This PAC gave $X to these legislators. How did they vote
 * on issues the PAC lobbied on?"
 */
export interface PACVoteInsight extends InsightBase {
  committeeId: string;
  committeeName: string;
  sector: IndustrySector;
  totalDisbursed: number;
  recipientCount: number;
  relevantBillCount: number;
  recipientVotes: PACRecipientVoteRecord[];
  aggregateYeaRate: number;
  aggregateBaselineYeaRate: number;
  peerComparison: PeerComparison;
  narrative: string;
}

// ── Insight 6: Stock Trade-Committee Jurisdiction ────────────────────

/** A single flagged stock trade in a committee-jurisdiction sector. */
export interface FlaggedTrade {
  ticker: string;
  assetDescription: string;
  transactionType: string;
  transactionDate: string;
  amount: string;
  owner: string;
  sector: IndustrySector;
  committeeName: string;
  sourceUrl: string;
}

/** Per-committee overlap summary. */
export interface CommitteeTradeOverlap {
  committeeName: string;
  committeeCode: string;
  jurisdictionSectors: IndustrySector[];
  flaggedTradeCount: number;
  totalTradesInSectors: number;
}

/**
 * Insight: stock trades in sectors regulated by the legislator's committees.
 * Answers: "Did this legislator trade stocks in sectors their committee regulates?"
 */
export interface StockCommitteeInsight extends InsightBase {
  bioguideId: string;
  totalTrades: number;
  totalResolvableTrades: number;
  flaggedTradeCount: number;
  /** flagged / resolvable */
  overlapRate: number;
  /** What % of random trades would overlap by chance */
  expectedOverlapRate: number;
  committees: CommitteeTradeOverlap[];
  flaggedTrades: FlaggedTrade[];
  /** Full sector breakdown — all resolved trades by sector, with committee overlap flag. */
  tradesBySector?: SectorTradeCount[];
  peerComparison: PeerComparison;
  narrative: string;
}

/** Sector-level trade count for the sector breakdown visualization. */
export interface SectorTradeCount {
  sector: IndustrySector;
  tradeCount: number;
  /** Whether any of the member's committees have jurisdiction over this sector. */
  overlapsCommittee: boolean;
}

// ── Bill Intelligence ────────────────────────────────────────────────

/**
 * Insight: sponsor/cosponsor funding analysis and related lobbying
 * activity for a specific bill. Answers: "Who funds this bill's
 * sponsors, and do those funders align with the bill's policy area?"
 */
export interface BillIntelligenceInsight extends InsightBase {
  billId: string;
  billTitle: string;
  policyArea: string;
  affectedSectors: IndustrySector[];
  sponsorAnalysis: {
    bioguideId: string;
    name: string;
    party: string;
    /** What % of sponsor's donations come from sectors this bill affects. */
    sectorDonationPercentage: number;
    sectorDonationAmount: number;
    totalDonations: number;
  } | null;
  cosponsorSummary: {
    totalCosponsors: number;
    analyzedCosponsors: number;
    /** Average sector donation % across analyzed cosponsors. */
    avgSectorDonationPercentage: number;
  };
  relatedLobbyingSpending: number;
  relatedLobbyingOrgs: number;
  narrative: string;

  // ── Story context (all optional, backward compatible) ─────────
  /** Vote outcome for this bill, if any recorded votes exist. */
  voteOutcome?: {
    chamber: 'House' | 'Senate';
    result: string;
    yea: number;
    nay: number;
    partyLine: boolean;
    bipartisan: boolean;
  };
  /** Bill progress status. */
  billProgress?: {
    status: string;
    daysSinceIntroduction: number;
    passedCommittee: boolean;
  };
  /** CBO fiscal impact estimate description, if available. */
  fiscalImpact?: string;
  /** Whether the sponsor sits on one of the bill's committees. */
  sponsorCommitteeConnection?: {
    connected: boolean;
    committeeName?: string;
    sponsorRole?: string;
  };
  /** Total raised by sponsor (gives percentage context). */
  sponsorFundingContext?: {
    totalRaised: number;
    cycle: number;
  };
  /** Number of related bills. */
  relatedBillCount?: number;
  /** Whether cosponsorship is bipartisan. */
  bipartisanCosponsorship?: boolean;
  /** Top lobbying organizations by name. */
  topLobbyingOrgs?: string[];
  /** ML-classified sectors with confidence scores from embedding classifier. */
  classifiedSectors?: Array<{ sector: IndustrySector; confidence: number }>;
  /** Lobbying filings with high language similarity to this bill. */
  lobbyingSimilarity?: BillLobbyingSimilarity;
}

// ── Vote Prediction (ML-based) ──────────────────────────────────────

/**
 * ML-derived vote prediction insight. Uses a trained XGBoost model to
 * predict how a legislator would vote based on their donor profile.
 * The key metric is the independence score: how often the legislator
 * votes against their donor-predicted position.
 */
export interface VotePredictionInsight extends InsightBase {
  bioguideId: string;
  independenceScore: {
    /** How often the legislator voted against model prediction (0-1). */
    score: number;
    /** Number of votes where model was confident. */
    confidentPredictions: number;
    /** Number of times legislator defied prediction. */
    deviations: number;
    /** Peer comparison — percentile among chamber peers. */
    peerPercentile: number;
  };
  /** Test set accuracy of the model (disclosed for transparency). */
  modelAccuracy: number;
  peerComparison: PeerComparison;
  /** Top 5 bills where legislator deviated from prediction. */
  notableDeviations: Array<{
    billId: string;
    billTitle: string;
    predictedVote: 'yea' | 'nay';
    actualVote: 'yea' | 'nay';
    yeaProbability: number;
    billSectors: IndustrySector[];
  }>;
  /** Top 3 model features driving this legislator's predictions. */
  topPredictiveFactors: Array<{
    feature: string;
    humanLabel: string;
    importance: number;
  }>;
  /** SHAP-based feature importance with directional context for visualization. */
  shapFactors?: Array<{
    feature: string;
    humanLabel: string;
    /** Mean absolute SHAP value for this feature. */
    importance: number;
    /** Actual feature value for this legislator/bill. */
    featureValue: number;
    /** Whether this feature pushes toward yea, nay, or is neutral. */
    direction: 'toward_yea' | 'toward_nay' | 'neutral';
  }>;
  narrative: string;
}

// ── Bill Lobbying Similarity ────────────────────────────────────────

/**
 * Semantic similarity between bill text and lobbying filing text.
 * Surfaces when legislative language mirrors what lobbyists asked for.
 */
export interface LobbyingSimilarityMatch {
  filingId: string;
  client: string;
  registrant: string;
  issueText: string;
  similarity: number;
  period: string;
  income: number;
}

export interface BillLobbyingSimilarity {
  billId: string;
  matches: LobbyingSimilarityMatch[];
  averageSimilarity: number;
  hasStrongMatches: boolean;
}

// ── Regulation Node ──────────────────────────────────────────────────

export interface RegulationNode {
  docketId: string;
  agency: string;
  agencySlug: string;
  title: string;
  type: 'proposed_rule' | 'final_rule';
  status: 'proposed' | 'comment_period' | 'comment_closed' | 'final' | 'effective' | 'withdrawn';
  publicationDate: string;
  rin: string | null;
  commentCount: number;
  linkMethod: 'committee_agency' | 'rin' | 'text_similarity';
  linkConfidence: number;
}

export interface RegulationInsight extends InsightBase {
  agencySlug: string;
  agencyName: string;
  regulationBillLinks: Array<{
    regulation: RegulationNode;
    billId: string;
    billTitle: string;
    confidence: number;
  }>;
  lobbyingCommentOverlap: Array<{
    organization: string;
    lobbyingSpending: number;
    commentCount: number;
    isOverlap: boolean;
  }>;
  activeRulemakings: number;
  finalizedRules: number;
  withdrawnRules: number;
  peerComparison: PeerComparison;
  narrative: string;
}

// ── Enforcement Node ─────────────────────────────────────────────────

export interface EnforcementAction {
  agency: 'EPA' | 'OSHA' | 'SEC' | 'CFPB';
  actionType: string;
  organization: string;
  resolvedCompany: import('@civiq/entity-resolution').ResolvedCompany | null;
  sector: IndustrySector | null;
  penaltyAmount: number;
  date: string;
  state: string;
  district: string | null;
}

export interface EnforcementInsight extends InsightBase {
  scope:
    | { type: 'sector'; sector: IndustrySector }
    | { type: 'state'; state: string }
    | { type: 'organization'; name: string };
  actions: EnforcementAction[];
  stats: {
    totalActions: number;
    totalPenalties: number;
    byAgency: Array<{ agency: string; count: number; penalties: number }>;
    trend: 'increasing' | 'decreasing' | 'stable';
    periodMonths: number;
  };
  linkedRegulations: Array<{ docketId: string; title: string; agency: string }>;
  peerComparison: PeerComparison;
  narrative: string;
}

// ── Influence Chain ──────────────────────────────────────────────────

export interface InfluenceChainLink {
  type:
    | 'lobbying'
    | 'contribution'
    | 'committee'
    | 'bill_match'
    | 'vote'
    | 'text_similarity'
    | 'regulation'
    | 'enforcement'
    | 'court_case'
    | 'outcome';
  label: string;
  confidence: number;
  data: Record<string, unknown>;
}

export interface InfluenceChain {
  organization: string;
  /** Senate LDA registrant ID, if this org lobbies on its own behalf. */
  registrantId?: string;
  lobbyingSpending: number;
  contributionAmount: number;
  billId: string;
  billTitle: string;
  vote: 'yea' | 'nay' | 'not_voting';
  textSimilarity: number | null;
  links: InfluenceChainLink[];
  chainConfidence: number;
  /** Whether FEC contribution data links money to this representative. */
  hasContributionEvidence: boolean;
}

export interface InfluenceChainInsight extends InsightBase {
  bioguideId: string;
  chains: InfluenceChain[];
  totalChainsDetected: number;
  chainsDropped: number;
  peerComparison: PeerComparison;
  narrative: string;
}

// ── Influence Graph (Full 6-Node Chain) ──────────────────────────────

export interface OutcomeSignal {
  type: 'stock_price' | 'economic_indicator' | 'enforcement_trend' | 'complaint_trend';
  metric: string;
  value: number;
  change: number;
  periodStart: string;
  periodEnd: string;
  direction: 'positive' | 'negative' | 'neutral';
  baseline: { value: number; label: string };
}

export interface InfluenceGraphChain extends InfluenceChain {
  regulationNode: RegulationNode | null;
  enforcementActions: EnforcementAction[];
  courtCases: Array<{ caseName: string; court: string; dateFiled: string; status: string }>;
  outcomeSignals: OutcomeSignal[];
}

export interface InfluenceGraphInsight extends InsightBase {
  bioguideId: string;
  chains: InfluenceGraphChain[];
  totalChainsDetected: number;
  chainsDropped: number;
  graphStats: {
    nodesCount: number;
    edgesCount: number;
    avgChainLength: number;
    maxChainLength: number;
    regulationLinks: number;
    enforcementLinks: number;
  };
  peerComparison: PeerComparison;
  narrative: string;
}

// ── Money Report Card ───────────────────────────────────────────────

export interface RepMoneyMetrics {
  bioguideId: string;
  name: string;
  party: string;
  chamber: 'House' | 'Senate';
  state: string;
  voteFinanceCorrelation: number | null;
  financeJurisdictionOverlap: number | null;
  independenceScore: number | null;
  influenceChainCount: number;
}

export interface DistrictAggregates {
  averageCorrelation: number | null;
  highestOverlap: { name: string; value: number } | null;
  lowestOverlap: { name: string; value: number } | null;
  mostIndependent: { name: string; value: number } | null;
  leastIndependent: { name: string; value: number } | null;
}

export interface MoneyReportCardInsight extends InsightBase {
  state: string;
  district: string;
  multiDistrict: boolean;
  representatives: RepMoneyMetrics[];
  aggregates: DistrictAggregates;
  narrative: string;
}

// ── Sector Leaderboard ──────────────────────────────────────────────

export interface SectorLeaderboardEntry {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  chamber: 'House' | 'Senate';
  sectorAlignmentScore: number;
  sectorDonationAmount: number;
  billsVotedOn: number;
  rank: number;
}

export interface SectorLeaderboardResponse {
  sector: IndustrySector;
  sectorLabel: string;
  chamber: 'house' | 'senate' | 'all';
  party: string | null;
  entries: SectorLeaderboardEntry[];
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

// ── Stock Trade Leaderboard ───────────────────────────────────────────

export interface StockTradeLeaderboardEntry {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  chamber: 'House' | 'Senate';
  tradeCount: number;
  estimatedValue: number;
  lateFilingCount: number;
  topTickers: string[];
  rank: number;
}

export interface StockTradeLeaderboardResponse {
  chamber: 'house' | 'senate' | 'all';
  party: string | null;
  sortBy: 'trades' | 'value' | 'late';
  entries: StockTradeLeaderboardEntry[];
  stats: {
    meanTrades: number;
    medianTrades: number;
    meanValue: number;
    totalMembers: number;
  };
  dataAvailability: {
    membersWithData: number;
    minimumRequired: number;
    status: 'sufficient' | 'partial' | 'empty';
  };
  generatedAt: string;
}

// ── Civic Intelligence Brief ─────────────────────────────────────────

/** 7 defined pattern types — AI selects from these, never invents new ones */
export type BriefPatternType =
  | 'funding-jurisdiction-overlap'
  | 'voting-party-divergence'
  | 'legislation-focus-shift'
  | 'donor-concentration'
  | 'in-state-funding-ratio'
  | 'committee-power-position'
  | 'lobbying-legislation-alignment'
  | 'legislative-effectiveness';

export interface BriefPatternSource {
  label: string;
  url: string;
}

export interface BriefPattern {
  type: BriefPatternType;
  headline: string;
  detail: string;
  dataPoints: Record<string, number | string>;
  significance: number;
  sources?: BriefPatternSource[];
}

export interface BriefIdentity {
  name: string;
  party: string;
  state: string;
  district: string | null;
  chamber: 'House' | 'Senate';
  termStart: string;
  committees: Array<{ name: string; role: string }>;
}

export interface BriefFunding {
  totalRaised: number | null;
  totalSpent: number | null;
  cashOnHand: number | null;
  inStatePct: number | null;
  topSectors: Array<{ sector: string; amount: number; pct: number; overlapsCommittee: boolean }>;
  contributionsSampled: number;
  cycle: number;
}

export interface BriefVoting {
  totalVotes: number;
  partyAlignmentPct: number | null;
  missedVotePct: number | null;
  billsSponsored: number;
  billsCosponsored: number;
  /** Bills that moved past introduction (reported, passed chamber, enacted). */
  billsProgressed?: number;
}

export interface BriefOversight {
  jurisdictionOverlapScore: number | null;
  lobbyingAlignmentScore: number | null;
  topLobbyingMatches: Array<{ filing: string; bill: string; similarity: number }>;
}

export interface CivicBriefInsight extends InsightBase {
  bioguideId: string;
  identity: BriefIdentity;
  funding: BriefFunding;
  voting: BriefVoting;
  oversight: BriefOversight;
  patterns: BriefPattern[];
  summary: string;
}

// ── Stance Classification ────────────────────────────────────────────

/**
 * Stance classification from zero-shot NLI model.
 * Detects whether text supports/opposes legislation or regulation.
 */
export interface StanceClassification {
  stance: string;
  confidence: number;
  context: 'lobbying' | 'regulatory';
}

// ── District Intelligence Summary ────────────────────────────────────

/**
 * Lightweight summary of intelligence availability for a district's representatives.
 * Not a full InsightBase — this is a thin aggregation response.
 */
export interface DistrictIntelligenceSummary {
  districtId: string;
  representatives: Array<{
    bioguideId: string;
    name: string;
    party: string;
    chamber: 'House' | 'Senate';
    /** Finance-jurisdiction overlap score (0-1), null if unavailable. */
    financeJurisdictionOverlap: number | null;
    /** Whether this representative has stock trade data. */
    hasStockTrades: boolean;
    /** Number of intelligence insights available. */
    insightsAvailable: number;
  }>;
}
