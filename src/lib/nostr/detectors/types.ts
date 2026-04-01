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

export interface CongressVote {
  congress: number;
  chamber: string;
  number: number;
  date: string;
  question: string;
  result: string;
  url: string;
  total?: {
    yea: number;
    nay: number;
    not_voting: number;
    present: number;
  };
}

export interface CongressVoteApiResponse {
  votes?: CongressVote[];
}

export const FEDERAL_REGISTER_API = 'https://www.federalregister.gov/api/v1';
export const GOVINFO_API = 'https://api.govinfo.gov';
