/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Election Results Types
 *
 * Types for 2024 election results aggregated from MEDSL precinct-level data.
 * Source: MIT Election Data and Science Lab via Harvard Dataverse.
 */

export type ElectionParty = 'D' | 'R' | 'L' | 'OTHER';

export type ElectionOffice =
  | 'US_PRESIDENT'
  | 'US_SENATE'
  | 'US_HOUSE'
  | 'GOVERNOR'
  | 'STATE_SENATE'
  | 'STATE_HOUSE';

export interface RaceResult {
  dem: number;
  rep: number;
  other: number;
  total: number;
  winner: ElectionParty;
  margin: number; // percentage points (positive = winner's margin)
  demPct: number;
  repPct: number;
}

export interface RaceResultFull extends RaceResult {
  year: number;
  office: ElectionOffice;
  districtId: string;
  dataAvailable: true;
}

export interface RaceResultUnavailable {
  year: number;
  office: ElectionOffice;
  districtId: string;
  dataAvailable: false;
  reason: 'state_not_in_dataset' | 'district_not_found';
}

export type RaceResultOrUnavailable = RaceResultFull | RaceResultUnavailable;

export interface ElectionMetadata {
  year: number;
  source: string;
  doi: string;
  generatedAt: string;
  coveredStates: string[];
  missingStates: string[];
}

/**
 * PR 19 — Election page payload contracts.
 *
 * The redesigned head-to-head /elections/[id] page consumes three thin
 * API endpoints. Race ids are uppercase, hyphen-separated:
 *   {year}-{office}-{state|NATIONAL}[-{district}]
 * e.g. 2024-US_SENATE-OH, 2024-US_HOUSE-PA-07, 2026-US_HOUSE-NY-08.
 */
export type ElectionRacePartyChair = 'D' | 'R';

export interface ElectionRaceId {
  year: number;
  office: ElectionOffice;
  state: string;
  district: string | null;
  raceId: string;
}

export interface ElectionRaceCandidate {
  candidateId: string;
  name: string;
  party: ElectionRacePartyChair;
  partyLong: string;
  office: ElectionOffice;
  state: string;
  district: string | null;
  incumbentChallenge: 'I' | 'C' | 'O' | null;
  incumbentChallengeFull: string | null;
  firstFileYear: number | null;
  totalReceipts: number | null;
}

export interface ElectionRacePayload {
  raceId: string;
  year: number;
  office: ElectionOffice;
  state: string;
  district: string | null;
  cycle: number;
  democrat: ElectionRaceCandidate;
  republican: ElectionRaceCandidate;
  result2024: RaceResultFull | null;
  dataAsOf: string;
}

export interface ElectionFinanceCandidateBlock {
  candidateId: string;
  party: ElectionRacePartyChair;
  receipts: number;
  cashOnHand: number;
  disbursements: number;
  individualPct: number | null;
  pacPct: number | null;
  smallDonorPct: number | null;
  smallDonorTotal: number | null;
  coverageEndDate: string | null;
}

export interface ElectionFinancePayload {
  raceId: string;
  cycle: number;
  candidates: ElectionFinanceCandidateBlock[];
  dataAsOf: string;
}

export interface ElectionTotalSpentBreakdown {
  candidateDisbursements: number;
  independentExpenditures: number;
  total: number;
}

export interface ElectionTotalSpentPayload {
  raceId: string;
  cycle: number;
  totalSpent: number;
  breakdown: ElectionTotalSpentBreakdown;
  dataAsOf: string;
}
