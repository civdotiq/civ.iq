/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Election Results Types
 *
 * Types for 2024 election results from MIT Election Data and Science Lab
 * (MEDSL) releases on Harvard Dataverse.
 */

export type ElectionParty = 'D' | 'R' | 'L' | 'OTHER';

export type ElectionOffice =
  'US_PRESIDENT' | 'US_SENATE' | 'US_HOUSE' | 'GOVERNOR' | 'STATE_SENATE' | 'STATE_HOUSE';

export interface RaceCandidateResult {
  /** As MEDSL lists it (uppercase), e.g. 'LATEEFAH SIMON'. */
  name: string;
  /** Every ballot line the candidate ran on, e.g. 'REPUBLICAN, LIBERTARIAN'. */
  party: string;
  partyCode: ElectionParty;
  votes: number;
  pct: number;
}

export interface RaceResult {
  dem: number;
  rep: number;
  other: number;
  total: number;
  winner: ElectionParty;
  margin: number; // percentage points (positive = winner's margin)
  demPct: number;
  repPct: number;
  /**
   * House and statewide races: every named candidate, most votes first. With candidates,
   * `margin` is first place minus second place, so a two-Democrat race reads
   * correctly. A single candidate ran unopposed; total 0 means no votes were
   * tallied (the race was not on the ballot).
   */
  candidates?: RaceCandidateResult[];
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
  /** FEC party code, e.g. 'DEM', 'REP', 'LIB', 'IND'. Not limited to two parties. */
  party: string;
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
  /** All FEC-filed candidates for the race, sorted by receipts descending. */
  candidates: ElectionRaceCandidate[];
  result2024: RaceResultFull | null;
  dataAsOf: string;
}

export interface ElectionFinanceCandidateBlock {
  candidateId: string;
  /** FEC party code passed through from the race header; '' when unknown. */
  party: string;
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
