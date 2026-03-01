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

export type CardType = 'profile' | 'money' | 'vote' | 'alignment' | 'legislation';

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
  bipartisanVotes: number;
  totalVotes: number;
  trend?: 'increasing' | 'decreasing' | 'stable';
}

/** Legislation card: sponsored bills summary */
export interface LegislationCardData extends CardBase {
  type: 'legislation';
  billsSponsored: number;
  billsEnacted: number;
  focusAreas: string[];
}

/** Union of all card data types */
export type TradingCardData =
  | ProfileCardData
  | MoneyCardData
  | VoteCardData
  | AlignmentCardData
  | LegislationCardData;

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
