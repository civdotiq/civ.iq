/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Trading Card Type Definitions
 *
 * Data interfaces for the 5 card types: Profile, Money, Vote, Alignment, Legislation.
 * All data sourced from real government APIs - never fabricated.
 */

export type CardType = 'profile' | 'money' | 'vote' | 'alignment' | 'legislation' | 'record';

/** Common fields shared across all card types */
export interface CardBase {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district?: string;
  chamber: 'House' | 'Senate';
  imageUrl?: string;
}

/** Profile card: overview stats */
export interface ProfileCardData extends CardBase {
  type: 'profile';
  billsSponsored?: number;
  totalRaised?: number;
  committees?: number;
  votesParticipated?: number;
}

/** Money card: campaign finance breakdown */
export interface MoneyCardData extends CardBase {
  type: 'money';
  totalRaised: number;
  individualPercent: number;
  pacPercent: number;
  topIndustry?: string;
  topIndustryAmount?: number;
  cycle: number;
}

/** Vote card: position on a specific bill */
export interface VoteCardData extends CardBase {
  type: 'vote';
  billId: string;
  billTitle: string;
  billNumber: string;
  position: string;
  voteDate: string;
  partyYea?: number;
  partyNay?: number;
  totalYea?: number;
  totalNay?: number;
}

/** Alignment card: party alignment stats */
export interface AlignmentCardData extends CardBase {
  type: 'alignment';
  partyAlignmentPercent: number;
  votesAgainstParty: number;
  totalVotes: number;
  peerAveragePercent?: number;
}

/** Legislation card: sponsored bills summary */
export interface LegislationCardData extends CardBase {
  type: 'legislation';
  billsSponsored: number;
  billsEnacted: number;
  focusAreas: string[];
}

/** One preformatted headline stat on the record summary card */
export interface RecordCardStat {
  value: string;
  label: string;
  baseline: string;
}

/**
 * Record summary card: the Incumbent Record Card's shareable OG image
 * (nutrition-label layout). Stats arrive preformatted from the
 * record-card feature so unavailable sections are simply absent —
 * never rendered as zeros.
 */
export interface RecordSummaryCardData extends CardBase {
  type: 'record';
  congress: number;
  inOfficeSince: string | null;
  termOrdinalLabel: string;
  stats: RecordCardStat[];
  sourcesLabel: string;
  asOfLabel: string;
  recordUrl: string;
}

/** Union of all card data types */
export type TradingCardData =
  | ProfileCardData
  | MoneyCardData
  | VoteCardData
  | AlignmentCardData
  | LegislationCardData
  | RecordSummaryCardData;

/** Props for on-site card components */
export interface CardComponentProps<T extends TradingCardData> {
  data: T;
}

/** Response from the card data API */
export interface CardDataResponse {
  success: boolean;
  data?: TradingCardData;
  error?: string;
}
