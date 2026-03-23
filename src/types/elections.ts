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

/** A single year's House result for a district, used in election history */
export interface HouseElectionHistoryEntry {
  year: number;
  result: RaceResult;
  redistricted: boolean;
}

/** Multi-year election history for a district */
export interface HouseElectionHistory {
  districtId: string;
  entries: HouseElectionHistoryEntry[];
  redistrictingYear: number;
}
