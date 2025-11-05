/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * State Judiciary Types
 *
 * Types for state supreme court justices, appellate judges,
 * and other state judicial officers.
 */

// ============================================================================
// Core State Judiciary Types
// ============================================================================

/**
 * Type of court in state judiciary system
 */
export type StateCourtType = 'supreme' | 'appellate' | 'trial' | 'specialty';

/**
 * Judicial selection method
 */
export type JudicialSelectionMethod =
  | 'appointment'
  | 'election_partisan'
  | 'election_nonpartisan'
  | 'merit_selection'
  | 'legislative_election';

/**
 * Base state judge/justice interface
 */
export interface StateJudge {
  wikidataId: string;
  name: string;
  court: string; // e.g., "Michigan Supreme Court"
  courtType: StateCourtType;
  position: string; // e.g., "Justice", "Chief Justice", "Judge"
  state: string; // Two-letter state code

  // Term information
  termStart?: string;
  termEnd?: string;
  isChief?: boolean;
  selectionMethod?: JudicialSelectionMethod;

  // Biographical
  photoUrl?: string;
  birthDate?: string;
  birthPlace?: string;
  education?: string[];

  // Career
  previousPositions?: string[];
  appointedBy?: string; // Governor or other appointing authority

  // Links
  wikipediaUrl?: string;
  courtWebsite?: string;
}

/**
 * State Supreme Court Justice (most common use case)
 */
export interface StateSupremeCourtJustice extends StateJudge {
  courtType: 'supreme';
  position: 'Justice' | 'Chief Justice';
}

/**
 * State Court System Information
 */
export interface StateCourtSystem {
  state: string;
  stateName: string;

  // Supreme Court
  supremeCourt: {
    name: string; // e.g., "Michigan Supreme Court", "Texas Supreme Court"
    seats: number;
    termLength: number; // years
    selectionMethod: JudicialSelectionMethod;
    justices: StateSupremeCourtJustice[];
  };

  // Appellate Courts (if applicable)
  appellateCourts?: Array<{
    name: string;
    seats: number;
    judges: StateJudge[];
  }>;

  // Metadata
  lastUpdated: string;
  dataSource: string[];
}

/**
 * API Response for state judiciary
 */
export interface StateJudiciaryApiResponse {
  success: boolean;
  data?: StateCourtSystem;
  error?: string;
  metadata?: {
    cacheHit?: boolean;
    responseTime?: number;
  };
}

/**
 * Summary view for lists
 */
export interface StateJudgeSummary {
  wikidataId: string;
  name: string;
  court: string;
  position: string;
  state: string;
  photoUrl?: string;
  termStart?: string;
}
