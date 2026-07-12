/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Shared Types for Civic Event Detectors
 * Interfaces for Congress.gov API responses used across detectors.
 */

export interface CongressBill {
  number: string;
  title: string;
  type: string;
  originChamber: string;
  congress: number;
  url: string;
  latestAction?: {
    actionDate: string;
    text: string;
  };
}

export interface CongressApiResponse {
  bills?: CongressBill[];
}

export interface HouseRollCallVoteDetail {
  congress: number;
  sessionNumber: number;
  rollCallNumber: number;
  startDate: string;
  result: string;
  voteQuestion?: string;
  legislationType?: string;
  legislationNumber?: string;
  legislationUrl?: string;
  sourceDataURL?: string;
  votePartyTotal?: Array<{
    yeaTotal: number;
    nayTotal: number;
    presentTotal: number;
    notVotingTotal: number;
  }>;
}

export interface HouseVoteListResponse {
  houseRollCallVotes?: unknown[];
  pagination?: { count: number };
}

export interface HouseVoteDetailResponse {
  houseRollCallVote?: HouseRollCallVoteDetail;
}

export const FEDERAL_REGISTER_API = 'https://www.federalregister.gov/api/v1';
export const GOVINFO_API = 'https://api.govinfo.gov';
